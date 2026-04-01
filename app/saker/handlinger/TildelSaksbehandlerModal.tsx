import { PersonPencilIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Select, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";

interface TildelSaksbehandlerModalProps {
  sakId: string;
  saksbehandlere: string[];
  submitPath?: string;
  åpen: boolean;
  onClose: () => void;
}

export function TildelSaksbehandlerModal({
  sakId,
  saksbehandlere,
  submitPath,
  åpen,
  onClose,
}: TildelSaksbehandlerModalProps) {
  const [valgtSaksbehandler, setValgtSaksbehandler] = useState("");
  const fetcher = useFetcher();
  const modalRef = useRef<HTMLDialogElement>(null);
  const saksreferanse = getSaksreferanse(sakId);

  const erSubmitting = fetcher.state !== "idle";

  function handleSubmit() {
    if (!valgtSaksbehandler) return;

    fetcher.submit(
      { handling: "tildel", sakId, saksbehandler: valgtSaksbehandler },
      {
        method: "post",
        action: submitPath ?? RouteConfig.SAKER_DETALJ.replace(":sakId", sakId),
      },
    );
    setValgtSaksbehandler("");
    onClose();
  }

  function handleClose() {
    setValgtSaksbehandler("");
    onClose();
  }

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={handleClose}
      header={{
        heading: "Tildel saksbehandler",
        icon: <PersonPencilIcon aria-hidden />,
      }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <BodyShort>Velg saksbehandler som skal ha ansvar for sak {saksreferanse}.</BodyShort>
          <Select
            label="Saksbehandler"
            value={valgtSaksbehandler}
            onChange={(event) => setValgtSaksbehandler(event.target.value)}
          >
            <option value="">Velg saksbehandler</option>
            {saksbehandlere.map((saksbehandler) => (
              <option key={saksbehandler} value={saksbehandler}>
                {saksbehandler}
              </option>
            ))}
          </Select>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleSubmit} disabled={!valgtSaksbehandler || erSubmitting}>
          Tildel
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
