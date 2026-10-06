import {
  Alert,
  BodyShort,
  Button,
  Heading,
  HStack,
  Pagination,
  Table,
  Tag,
} from "@navikt/ds-react";
import { Form, Link, useSearchParams } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { formaterFødselsnummer } from "~/utils/string-utils";
import { sporHendelse } from "~/analytics/analytics";
import {
  MIGRERING_SIDESTORRELSE,
  type MigreringKandidat,
  type MigreringLister,
  type MigreringSide,
} from "./types";

export function MigreringInnhold({ lister }: { lister: MigreringLister }) {
  const kandidater = lister.mine.kandidater;

  return (
    <div className="mt-4 mb-8 flex flex-col gap-6">
      <Heading level="1" size="large">
        Migrering
      </Heading>
      {lister.utilgjengelig && (
        <Alert variant="warning" size="small">
          Vi fikk ikke hentet hele migreringslisten. Det kan mangle saker. Prøv igjen om litt.
        </Alert>
      )}
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">PID</Table.HeaderCell>
              <Table.HeaderCell scope="col">Personnummer</Table.HeaderCell>
              <Table.HeaderCell scope="col">Opprettet i Access</Table.HeaderCell>
              <Table.HeaderCell scope="col">
                <span className="sr-only">Status og handling</span>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {kandidater.map((k) => (
              <Table.Row
                key={`${k.kilde}:${k.legacyPid}`}
                className={
                  k.alleredeMigrertTilKontrollsakId && k.migreringsstatus === "FULLSTENDIG"
                    ? "bg-ax-bg-success-soft"
                    : undefined
                }
              >
                <Table.DataCell>{k.legacyPid}</Table.DataCell>
                <Table.DataCell>
                  {k.ansvar.type === "BEKREFTET" && k.personIdent
                    ? formaterFødselsnummer(k.personIdent)
                    : "–"}
                </Table.DataCell>
                <Table.DataCell>{k.referansedato ?? "–"}</Table.DataCell>
                <Table.DataCell>
                  {k.alleredeMigrertTilKontrollsakId ? (
                    <Link
                      to={RouteConfig.SAKER_DETALJ.replace(
                        ":sakId",
                        getSaksreferanse(k.alleredeMigrertTilKontrollsakId),
                      )}
                    >
                      {k.migreringsstatus === "FULLSTENDIG" ? (
                        <Tag
                          variant="strong"
                          data-color="success"
                          size="small"
                          className="rounded-full"
                        >
                          Flyttet til Watson Sak 🎉
                        </Tag>
                      ) : k.migreringsstatus === "UNDER_MIGRERING" ? (
                        <Tag
                          variant="strong"
                          data-color="warning"
                          size="small"
                          className="rounded-full"
                        >
                          Under flytting
                        </Tag>
                      ) : (
                        "Åpne sak"
                      )}
                    </Link>
                  ) : (
                    <Form
                      method="post"
                      action={RouteConfig.API.FORHÅNDSUTFYLL_REGISTRER_SAK}
                      onSubmit={() =>
                        sporHendelse("migrering opprett sak klikket", { kategori: k.kategori })
                      }
                    >
                      <input type="hidden" name="legacyPid" value={k.legacyPid} />
                      <input type="hidden" name="legacyKilde" value={k.legacyKilde} />
                      {k.ansvar.type === "BEKREFTET" && k.personIdent && (
                        <input type="hidden" name="fnr" value={k.personIdent} />
                      )}
                      <Button
                        type="submit"
                        variant="secondary"
                        size="small"
                        disabled={k.ansvar.type !== "BEKREFTET"}
                      >
                        Opprett sak
                      </Button>
                    </Form>
                  )}
                </Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
      <Sidevelger side={lister.mine} parameter="side" />
      {lister.ansatte.kandidater.length > 0 && <AnsatteListe ansatte={lister.ansatte} />}
    </div>
  );
}

/** Lederens oversikt over ansattes kandidater. Viser verken personnummer eller handlinger. */
function AnsatteListe({ ansatte }: { ansatte: MigreringSide }) {
  return (
    <section aria-labelledby="migrering-ansatte" className="flex flex-col gap-4">
      <Heading level="2" size="small" id="migrering-ansatte">
        Ansatte
      </Heading>
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">PID</Table.HeaderCell>
              <Table.HeaderCell scope="col">Ansvarlig</Table.HeaderCell>
              <Table.HeaderCell scope="col">Opprettet i Access</Table.HeaderCell>
              <Table.HeaderCell scope="col">Status</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {ansatte.kandidater.map((k) => (
              <Table.Row key={`${k.kilde}:${k.legacyPid}`}>
                <Table.DataCell>{k.legacyPid}</Table.DataCell>
                <Table.DataCell>{k.ansvar.navIdent ?? "–"}</Table.DataCell>
                <Table.DataCell>{k.referansedato ?? "–"}</Table.DataCell>
                <Table.DataCell>{statusTekst(k)}</Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
      <Sidevelger side={ansatte} parameter="ansatteSide" />
    </section>
  );
}

/**
 * Sidenavigasjon med Aksel sin `Pagination`. Sidenummeret ligger i URL-en (`parameter`), så en side kan
 * lenkes til og lastes på nytt, og de to listene har hver sin side.
 */
function Sidevelger({ side, parameter }: { side: MigreringSide; parameter: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  if (side.totalAntall === 0) return null;

  const fra = (side.side - 1) * MIGRERING_SIDESTORRELSE + 1;
  const til = fra + side.kandidater.length - 1;

  function gåTilSide(ny: number) {
    const neste = new URLSearchParams(searchParams);
    if (ny <= 1) {
      neste.delete(parameter);
    } else {
      neste.set(parameter, String(ny));
    }
    setSearchParams(neste, { preventScrollReset: true });
  }

  return (
    <HStack justify="space-between" align="center" gap="space-16" wrap>
      <BodyShort size="small" textColor="subtle">
        Viser {fra}–{til} av {side.totalAntall}
      </BodyShort>
      {side.totalSider > 1 && (
        <Pagination
          page={side.side}
          onPageChange={gåTilSide}
          count={side.totalSider}
          size="small"
        />
      )}
    </HStack>
  );
}

function statusTekst(k: MigreringKandidat): string {
  if (k.migreringsstatus === "FULLSTENDIG") return "Flyttet til Watson Sak";
  if (k.migreringsstatus === "UNDER_MIGRERING") return "Under flytting";
  return "Ikke påbegynt";
}
