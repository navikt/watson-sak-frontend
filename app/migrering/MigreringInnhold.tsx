import { Alert, BodyShort, Button, Heading, Table } from "@navikt/ds-react";
import { useState } from "react";
import { Form } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { sporHendelse } from "~/analytics/analytics";
import { formaterFødselsnummer } from "~/utils/string-utils";
import { MigreringGrunnlagModal } from "./MigreringGrunnlagModal";
import { MigreringsAvklaringer } from "./MigreringsAvklaringer";
import type { MigreringKandidat, MigreringLister } from "./types";

/**
 * Flat liste iht Figma («1. Migrering – liste», docs/migrering.jpeg): PID,
 * personnummer, opprettet i Access, og en «Opprett sak»-knapp per rad. Ingen
 * kategorifaner, søk eller filter i denne visningen — de seks kategoriene og
 * MINE/UTEN_ANSVARLIG-skillet finnes fortsatt i datamodellen og API-et
 * (kontrakten § 1 og § 4), men er ikke del av dette skjermbildet.
 *
 * Personnummer vises bare for kandidater med bekreftet ansvar
 * (`k.personIdent` er `null` for alle andre — håndhevet på backend i
 * `MigreringResponseMapper`, ikke bare skjult her). Se avsnitt 10 i
 * migrering-avklaringer.md.
 */
function Migreringstabell({
  kandidater,
  onVisGrunnlag,
}: {
  kandidater: MigreringKandidat[];
  onVisGrunnlag: (kandidat: MigreringKandidat) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <caption className="sr-only">Migreringskandidater fra Access</caption>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell scope="col">PID</Table.HeaderCell>
            <Table.HeaderCell scope="col">Personnummer</Table.HeaderCell>
            <Table.HeaderCell scope="col">Opprettet i Access</Table.HeaderCell>
            <Table.HeaderCell scope="col">
              <span className="sr-only">Handling</span>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {kandidater.length === 0 ? (
            <Table.Row>
              <Table.DataCell colSpan={4}>Ingen kandidater funnet.</Table.DataCell>
            </Table.Row>
          ) : (
            kandidater.map((k) => (
              <Table.Row key={`${k.kilde}:${k.legacyPid}`}>
                <Table.HeaderCell scope="row">{k.legacyPid}</Table.HeaderCell>
                <Table.DataCell>
                  {k.ansvar.type === "BEKREFTET" && k.personIdent
                    ? formaterFødselsnummer(k.personIdent)
                    : "–"}
                </Table.DataCell>
                <Table.DataCell>{k.referansedato ?? "–"}</Table.DataCell>
                <Table.DataCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="small"
                      aria-label={`Se grunnlag for PID ${k.legacyPid}`}
                      onClick={() => onVisGrunnlag(k)}
                    >
                      Se grunnlag
                    </Button>
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
                        size="small"
                        variant="primary"
                        disabled={k.ansvar.type !== "BEKREFTET"}
                        aria-describedby={
                          k.ansvar.type !== "BEKREFTET"
                            ? "migrering-opprettelse-krever-ansvar"
                            : "migrering-opprettelse-info"
                        }
                      >
                        Opprett sak
                      </Button>
                    </Form>
                  </div>
                </Table.DataCell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>
    </div>
  );
}

export function MigreringInnhold({ lister }: { lister: MigreringLister }) {
  const [valgt, setValgt] = useState<MigreringKandidat | null>(null);
  const alleKandidater = [...lister.mine, ...lister.utenBekreftetAnsvarlig];

  return (
    <div className="flex flex-col gap-6">
      <Heading level="1" size="large">
        Migreringsveileder
      </Heading>
      <Alert variant="info">
        <BodyShort weight="semibold">Prototype – kun syntetiske eksempler</BodyShort>
        <BodyShort>Vurderingene er foreløpige. Ingen ekte saker hentes eller overføres.</BodyShort>
      </Alert>
      <BodyShort id="migrering-opprettelse-info">
        «Opprett sak» forhåndsutfyller person for kandidater du allerede har bekreftet ansvar for.
      </BodyShort>
      <BodyShort id="migrering-opprettelse-krever-ansvar" size="small" textColor="subtle">
        Opprettelse krever bekreftet ansvar. Kandidater du bare ser via enhetstilgang («uten
        bekreftet ansvarlig») kan ikke opprettes herfra — se avsnitt 4 og 6 (avklaring H) i
        migreringsnotatet.
      </BodyShort>
      <Migreringstabell kandidater={alleKandidater} onVisGrunnlag={setValgt} />
      <MigreringsAvklaringer />
      <MigreringGrunnlagModal kandidat={valgt} onClose={() => setValgt(null)} />
    </div>
  );
}
