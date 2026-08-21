import { TrashIcon } from "@navikt/aksel-icons";
import { BodyLong, Button, Modal } from "@navikt/ds-react";

type SlettFilModalProps = {
  kandidat: string | null;
  sletter: boolean;
  onBekreft: () => void;
  onAvbryt: () => void;
};

export function SlettFilModal({ kandidat, sletter, onBekreft, onAvbryt }: SlettFilModalProps) {
  return (
    <Modal
      open={kandidat !== null}
      onClose={onAvbryt}
      header={{ heading: "Slette vedlegg?", icon: <TrashIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <BodyLong>
          Er du sikker på at du vil slette <strong>{kandidat}</strong>? Dette kan ikke angres.
        </BodyLong>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={onBekreft} loading={sletter}>
          Slett vedlegg
        </Button>
        <Button variant="secondary" onClick={onAvbryt} disabled={sletter}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
