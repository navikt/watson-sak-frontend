import { ArrowsCirclepathIcon } from "@navikt/aksel-icons";
import { Button, Heading, HStack, Table, Tag } from "@navikt/ds-react";
import { Form, Link } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { sporHendelse } from "~/analytics/analytics";
import type { MigreringLister } from "./types";

export function MigreringInnhold({ lister }: { lister: MigreringLister }) {
  const kandidater = [...lister.mine, ...lister.utenBekreftetAnsvarlig];

  return (
    <div className="flex flex-col gap-6">
      <HStack align="center" gap="space-8">
        <ArrowsCirclepathIcon fontSize="1.5rem" aria-hidden />
        <Heading level="1" size="medium">
          Migrering
        </Heading>
      </HStack>
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
                  {k.ansvar.type === "BEKREFTET" && k.personIdent ? k.personIdent : "–"}
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
    </div>
  );
}
