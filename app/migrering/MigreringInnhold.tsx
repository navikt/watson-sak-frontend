import { Heading, Tag, Table, Button } from "@navikt/ds-react";
import { Form, Link } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { sporHendelse } from "~/analytics/analytics";
import type { MigreringKandidat, MigreringLister } from "./types";

function TilBehandlingTabell({ kandidater }: { kandidater: MigreringKandidat[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell scope="col">PID</Table.HeaderCell>
            <Table.HeaderCell scope="col">Personnummer</Table.HeaderCell>
            <Table.HeaderCell scope="col">Opprettet i Access</Table.HeaderCell>
            <Table.HeaderCell scope="col" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {kandidater.map((k) => (
            <Table.Row key={`${k.kilde}:${k.legacyPid}`}>
              <Table.DataCell>{k.legacyPid}</Table.DataCell>
              <Table.DataCell>
                {k.ansvar.type === "BEKREFTET" && k.personIdent ? k.personIdent : "–"}
              </Table.DataCell>
              <Table.DataCell>{k.referansedato ?? "–"}</Table.DataCell>
              <Table.DataCell>
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
                  <Button type="submit" size="small" disabled={k.ansvar.type !== "BEKREFTET"}>
                    Opprett sak
                  </Button>
                </Form>
              </Table.DataCell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}

function OverførtTabell({ kandidater }: { kandidater: MigreringKandidat[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Heading level="2" size="medium">
        Overført til Watson
      </Heading>
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell scope="col">PID</Table.HeaderCell>
              <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
              <Table.HeaderCell scope="col">Opprettet i Access</Table.HeaderCell>
              <Table.HeaderCell scope="col" />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {kandidater.map((k) => (
              <Table.Row key={`${k.kilde}:${k.legacyPid}`}>
                <Table.DataCell>{k.legacyPid}</Table.DataCell>
                <Table.DataCell>{k.navn}</Table.DataCell>
                <Table.DataCell>{k.referansedato ?? "–"}</Table.DataCell>
                <Table.DataCell>
                  <Link
                    to={RouteConfig.SAKER_DETALJ.replace(
                      ":sakId",
                      getSaksreferanse(k.alleredeMigrertTilKontrollsakId ?? 0),
                    )}
                  >
                    <Tag variant="success" size="small">
                      Overført til Watson
                    </Tag>
                  </Link>
                </Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>
    </div>
  );
}

export function MigreringInnhold({ lister }: { lister: MigreringLister }) {
  const alleKandidater = [...lister.mine, ...lister.utenBekreftetAnsvarlig];
  const tilBehandling = alleKandidater.filter((k) => !k.alleredeMigrertTilKontrollsakId);
  const overført = alleKandidater.filter((k) => k.alleredeMigrertTilKontrollsakId);

  return (
    <div className="flex flex-col gap-6">
      <Heading level="1" size="large">
        Migreringsveileder
      </Heading>
      <TilBehandlingTabell kandidater={tilBehandling} />
      {overført.length > 0 && <OverførtTabell kandidater={overført} />}
    </div>
  );
}
