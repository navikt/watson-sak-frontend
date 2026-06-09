import { TrashIcon } from "@navikt/aksel-icons";
import { BodyLong, Button, Modal } from "@navikt/ds-react";

type SlettDokumentModalProps = {
  /** Dokumentet som vurderes slettet, eller `null` når dialogen er lukket. */
  kandidat: { tittel: string } | null;
  sletter: boolean;
  onBekreft: () => void;
  onAvbryt: () => void;
};

/** Bekreftelsesdialog før et dokument slettes permanent. */
export function SlettDokumentModal({
  kandidat,
  sletter,
  onBekreft,
  onAvbryt,
}: SlettDokumentModalProps) {
  return (
    <Modal
      open={kandidat !== null}
      onClose={onAvbryt}
      header={{ heading: "Slette dokument?", icon: <TrashIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <BodyLong>
          Er du sikker på at du vil slette <strong>{kandidat?.tittel || "Uten tittel"}</strong>?
          Dette kan ikke angres.
        </BodyLong>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={onBekreft} loading={sletter}>
          Slett dokument
        </Button>
        <Button variant="secondary" onClick={onAvbryt} disabled={sletter}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
