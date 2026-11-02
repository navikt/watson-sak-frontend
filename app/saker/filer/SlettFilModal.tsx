import { TrashIcon } from "@navikt/aksel-icons";
import { BodyLong, Button, Modal, VStack } from "@navikt/ds-react";
import type { ReactNode } from "react";

type SlettFilModalProps = {
  kandidat: string | null;
  sletter: boolean;
  onBekreft: () => void;
  onAvbryt: () => void;
  /** Feilmelding som vises i dialogen, f.eks. ved teknisk feil. */
  feil?: ReactNode;
};

export function SlettFilModal({
  kandidat,
  sletter,
  onBekreft,
  onAvbryt,
  feil,
}: SlettFilModalProps) {
  return (
    <Modal
      open={kandidat !== null}
      onClose={onAvbryt}
      header={{ heading: "Slette vedlegg?", icon: <TrashIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-16">
          <BodyLong>
            Er du sikker på at du vil slette <strong>{kandidat}</strong>? Dette kan ikke angres.
          </BodyLong>
          {feil}
        </VStack>
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
