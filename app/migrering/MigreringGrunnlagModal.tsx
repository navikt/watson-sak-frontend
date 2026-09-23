import { BodyShort, Button, Heading, Modal, Table, Tag } from "@navikt/ds-react";
import { kildeEtikett, vurderingEtikett, type MigreringKandidat } from "./types";

export function MigreringGrunnlagModal({
  kandidat,
  onClose,
}: {
  kandidat: MigreringKandidat | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={kandidat !== null}
      onClose={onClose}
      header={{ heading: "Grunnlag for foreløpig vurdering" }}
      width="medium"
    >
      <Modal.Body>
        {kandidat && (
          <div className="flex flex-col gap-4">
            <Heading level="2" size="small">
              {kandidat.navn}
            </Heading>
            <BodyShort>
              {kildeEtikett[kandidat.kilde]} · PID {kandidat.pid}
            </BodyShort>
            <div>
              <Tag variant={kandidat.vurdering === "MA_AVKLARES" ? "warning" : "info"}>
                {vurderingEtikett[kandidat.vurdering]}
              </Tag>
            </div>
            <BodyShort>{kandidat.begrunnelse}</BodyShort>
            <BodyShort>
              {kandidat.ansvar.type === "BEKREFTET"
                ? "Ansvar er simulert som bekreftet for innlogget bruker."
                : kandidat.ansvar.type === "LOGGTREFF"
                  ? "Kun søkeloggtreff. Dette bekrefter ikke eierskap og gir ikke tilgang til ekte saker."
                  : "Ansvar er ikke bekreftet. Dette betyr ikke nødvendigvis at saken er ufordelt."}
            </BodyShort>
            <Table size="small">
              <caption className="text-left pb-2">
                Syntetiske kildefelt – ikke hentet fra Access
              </caption>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Felt</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Verdi</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {kandidat.kildefelter.map(({ felt, verdi }) => (
                  <Table.Row key={felt}>
                    <Table.HeaderCell scope="row">{felt}</Table.HeaderCell>
                    <Table.DataCell>{verdi ?? "Mangler (NULL)"}</Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <BodyShort size="small">
              Kilde og PID holdes adskilt. Lik PID eller FNR beviser ikke kobling mellom utredning
              og SV. «Satt» betyr bare at et datofelt er utfylt, ikke at saken er avsluttet.
            </BodyShort>
            <BodyShort>
              Ingen godkjenning, tildeling eller opprettelse lagres i denne prototypen.
            </BodyShort>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" type="button" onClick={onClose}>
          Lukk grunnlag
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
