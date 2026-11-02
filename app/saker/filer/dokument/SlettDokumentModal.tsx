import { TrashIcon } from "@navikt/aksel-icons";
import { BodyLong, Button, Modal, VStack } from "@navikt/ds-react";
import type { ReactNode } from "react";

type SlettDokumentModalProps = {
  /** Dokumentet som vurderes slettet, eller `null` når dialogen er lukket. */
  kandidat: { tittel: string } | null;
  sletter: boolean;
  onBekreft: () => void;
  onAvbryt: () => void;
  feil?: ReactNode;
};

/** Bekreftelsesdialog før et dokument slettes permanent. */
export function SlettDokumentModal({
  kandidat,
  sletter,
  onBekreft,
  onAvbryt,
  feil,
}: SlettDokumentModalProps) {
  return (
    <Modal
      open={kandidat !== null}
      onClose={onAvbryt}
      header={{ heading: "Slette dokument?", icon: <TrashIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-16">
          <BodyLong>
            Er du sikker på at du vil slette <strong>{kandidat?.tittel || "Uten tittel"}</strong>?
            Dette kan ikke angres.
          </BodyLong>
          {feil}
        </VStack>
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
