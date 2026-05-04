import { PersonPencilIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Select, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";

interface OverforAnsvarligModalProps {
  sakId: string;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  åpen: boolean;
  onClose: () => void;
}

export function OverforAnsvarligModal({
  sakId,
  saksbehandlerDetaljer,
  åpen,
  onClose,
}: OverforAnsvarligModalProps) {
  const [valgtNavIdent, setValgtNavIdent] = useState("");
  const fetcher = useFetcher();
  const modalRef = useRef<HTMLDialogElement>(null);
  const saksreferanse = getSaksreferanse(sakId);

  const erSubmitting = fetcher.state !== "idle";

  function handleClose() {
    setValgtNavIdent("");
    onClose();
  }

  function handleSubmit() {
    if (!valgtNavIdent) {
      return;
    }

    fetcher.submit(
      { handling: "overfor_ansvarlig", navIdent: valgtNavIdent },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse),
      },
    );
    handleClose();
  }

  function handleFjernSaksbehandler() {
    fetcher.submit(
      { handling: "FRISTILL" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse),
      },
    );
    handleClose();
  }

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={handleClose}
      header={{
        heading: "Endre ansvarlig saksbehandler",
        icon: <PersonPencilIcon aria-hidden />,
      }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <BodyShort>Velg ny ansvarlig saksbehandler for sak {saksreferanse}.</BodyShort>
          <Select
            label="Saksbehandler"
            value={valgtNavIdent}
            onChange={(event) => setValgtNavIdent(event.target.value)}
          >
            <option value="">Velg saksbehandler</option>
            {saksbehandlerDetaljer.map((saksbehandler) => (
              <option key={saksbehandler.navIdent} value={saksbehandler.navIdent}>
                {`${saksbehandler.navn} (${saksbehandler.navIdent})`}
              </option>
            ))}
          </Select>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleSubmit} disabled={!valgtNavIdent || erSubmitting}>
          Overfør sak
        </Button>
        <Button
          variant="danger"
          onClick={handleFjernSaksbehandler}
          disabled={erSubmitting}
        >
          Fjern saksbehandler
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
