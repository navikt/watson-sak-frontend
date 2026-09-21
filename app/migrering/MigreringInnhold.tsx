import { BodyShort, Button, Heading, Search, Table, Tabs, Tag } from "@navikt/ds-react";
import { useState, useMemo } from "react";
import { Form } from "react-router";
import { RouteConfig } from "~/routeConfig";
import type { MigreringKandidat } from "./types";

interface MigreringInnholdProps {
  kandidater: MigreringKandidat[];
  innloggetNavIdent: string;
}

export function MigreringInnhold({ kandidater, innloggetNavIdent }: MigreringInnholdProps) {
  const [soketekst, setSoketekst] = useState("");
  const [aktivFane, setAktivFane] = useState<string>("mine");

  const mineKandidater = useMemo(
    () => kandidater.filter((k) => k.ansvarligNavIdent === innloggetNavIdent),
    [kandidater, innloggetNavIdent],
  );

  const ufordelteKandidater = useMemo(
    () => kandidater.filter((k) => !k.ansvarligNavIdent),
    [kandidater],
  );

  const gjeldendeListe = aktivFane === "mine" ? mineKandidater : ufordelteKandidater;

  const filtrertListe = useMemo(() => {
    if (!soketekst.trim()) return gjeldendeListe;
    const lower = soketekst.toLowerCase();
    return gjeldendeListe.filter(
      (k) =>
        k.pid.includes(lower) ||
        k.fnr.includes(lower) ||
        k.navn.toLowerCase().includes(lower) ||
        k.sakstype.toLowerCase().includes(lower),
    );
  }, [gjeldendeListe, soketekst]);

  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <Heading level="1" size="large">
          Migrering
        </Heading>
        <BodyShort className="text-ax-text-neutral-subtle">
          Saker fra gammelt Access-system som skal overføres til Watson Sak.
        </BodyShort>
      </div>

      <Tabs value={aktivFane} onChange={setAktivFane}>
        <Tabs.List>
          <Tabs.Tab value="mine" label={`Mine saker (${mineKandidater.length})`} />
          <Tabs.Tab value="ufordelte" label={`Ufordelte saker (${ufordelteKandidater.length})`} />
        </Tabs.List>

        <div className="pt-4 flex flex-col gap-4">
          <div className="max-w-md">
            <Search
              label="Søk på PID, navn eller sakstype"
              variant="simple"
              value={soketekst}
              onChange={setSoketekst}
              onClear={() => setSoketekst("")}
            />
          </div>

          <div className="border border-ax-border-neutral-subtle rounded-md overflow-hidden bg-ax-bg-default">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">PID</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Opprettet i Access</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Sakstype</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Handling</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filtrertListe.length === 0 ? (
                  <Table.Row>
                    <Table.DataCell colSpan={5} className="text-center py-8">
                      <BodyShort className="text-ax-text-neutral-subtle">
                        Ingen saker funnet
                      </BodyShort>
                    </Table.DataCell>
                  </Table.Row>
                ) : (
                  filtrertListe.map((kandidat) => (
                    <Table.Row key={kandidat.sid}>
                      <Table.DataCell className="font-medium">{kandidat.pid}</Table.DataCell>
                      <Table.DataCell>{kandidat.navn}</Table.DataCell>
                      <Table.DataCell>{kandidat.opprettetIAccess}</Table.DataCell>
                      <Table.DataCell>
                        <Tag variant="neutral" size="small">
                          {kandidat.sakstype}
                        </Tag>
                      </Table.DataCell>
                      <Table.DataCell>
                        {kandidat.alleredeOverfort ? (
                          <Tag variant="success" size="medium">
                            Overført til Watson 🚀
                          </Tag>
                        ) : (
                          <Form method="post" action={RouteConfig.API.FORHÅNDSUTFYLL_REGISTRER_SAK}>
                            <input type="hidden" name="fnr" value={kandidat.fnr} />
                            <input type="hidden" name="pid" value={kandidat.pid} />
                            <Button type="submit" variant="secondary" size="small">
                              Opprett sak
                            </Button>
                          </Form>
                        )}
                      </Table.DataCell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
