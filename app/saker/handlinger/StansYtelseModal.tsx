import { XMarkOctagonIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, VStack } from "@navikt/ds-react";
import { useRef } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";

interface StansYtelseModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

export function StansYtelseModal({ sakId, åpen, onClose }: StansYtelseModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();

  function handleBekreft() {
    fetcher.submit(
      { handling: "stans_ytelse" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      },
    );
    onClose();
  }

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={onClose}
      header={{ heading: "Stans ytelse", icon: <XMarkOctagonIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-2">
          <BodyShort>Er du sikker på at du vil sende stans-oppgave i Gosys?</BodyShort>
          <BodyShort>Dette kan ikke angres.</BodyShort>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={handleBekreft}>
          Send stans-oppgave
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
