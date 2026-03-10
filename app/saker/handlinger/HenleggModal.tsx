import { XMarkOctagonIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Button, Modal, Textarea, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";

interface HenleggModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

export function HenleggModal({ sakId, åpen, onClose }: HenleggModalProps) {
  const [begrunnelse, setBegrunnelse] = useState("");
  const fetcher = useFetcher();
  const modalRef = useRef<HTMLDialogElement>(null);

  const erSubmitting = fetcher.state !== "idle";

  function handleSubmit() {
    fetcher.submit(
      {
        handling: "henlegg",
        ...(begrunnelse.trim() ? { notat: begrunnelse.trim() } : {}),
      },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", sakId),
      },
    );
    setBegrunnelse("");
    onClose();
  }

  function handleClose() {
    setBegrunnelse("");
    onClose();
  }

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={handleClose}
      header={{
        heading: "Henlegg sak",
        icon: <XMarkOctagonIcon aria-hidden />,
      }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <Alert variant="warning" size="small">
            Er du sikker på at du vil henlegge sak {sakId}? Denne handlingen kan ikke angres.
          </Alert>
          <Textarea
            label="Begrunnelse (valgfritt)"
            description="Beskriv hvorfor saken henlegges."
            value={begrunnelse}
            onChange={(e) => setBegrunnelse(e.target.value)}
          />
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="danger" onClick={handleSubmit} disabled={erSubmitting}>
          Henlegg sak
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
