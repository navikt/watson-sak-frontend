import { BodyShort, Button, Modal, Table, Tag } from "@navikt/ds-react";
import { useRef } from "react";
import type { KontrollsakResponse } from "~/saker/types.backend";

interface PersonIdentHistorikkModalProps {
  sak: KontrollsakResponse;
  åpen: boolean;
  onClose: () => void;
}

export function PersonIdentHistorikkModal({ sak, åpen, onClose }: PersonIdentHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={onClose}
      header={{ heading: "Identifikatorhistorikk" }}
      width="32rem"
    >
      <Modal.Body>
        {sak.historiskeIdenter.length === 0 ? (
          <BodyShort>Ingen historiske identifikatorer funnet.</BodyShort>
        ) : (
          <Table size="small">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Identifikator</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sak.historiskeIdenter.map((ident) => (
                <Table.Row key={ident.personIdent}>
                  <Table.DataCell>{ident.personIdent}</Table.DataCell>
                  <Table.DataCell>
                    {{
                      FOEDSELSNUMMER: "Fødselsnummer",
                      DNR: "D-nummer",
                      FH_NUMMER: "FH-nummer",
                      NPID: "NPID",
                    }[ident.type] ?? ident.type}
                  </Table.DataCell>
                  <Table.DataCell>
                    {ident.historisk ? (
                      <Tag variant="neutral" size="small">
                        Historisk
                      </Tag>
                    ) : (
                      <Tag variant="success" size="small">
                        Gjeldende
                      </Tag>
                    )}
                  </Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Lukk
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
