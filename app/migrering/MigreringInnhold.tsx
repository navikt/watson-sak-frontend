import { Button, Heading, Table } from "@navikt/ds-react";
import { Form } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { sporHendelse } from "~/analytics/analytics";
import type { MigreringLister } from "./types";

export function MigreringInnhold({ lister }: { lister: MigreringLister }) {
  const kandidater = [...lister.mine, ...lister.utenBekreftetAnsvarlig];

  return (
    <div className="flex flex-col gap-6">
      <Heading level="1" size="large">
        Migreringsveileder
      </Heading>
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
    </div>
  );
}
