import { ArrowForwardIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Select, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";

interface VideresendTilSeksjonModalProps {
  sakId: string;
  nåværendeSeksjon: string;
  seksjoner: string[];
  åpen: boolean;
  onClose: () => void;
}

export function VideresendTilSeksjonModal({
  sakId,
  nåværendeSeksjon,
  seksjoner,
  åpen,
  onClose,
}: VideresendTilSeksjonModalProps) {
  const [valgtSeksjon, setValgtSeksjon] = useState("");
  const fetcher = useFetcher();
  const modalRef = useRef<HTMLDialogElement>(null);

  const erSubmitting = fetcher.state !== "idle";
  const andreSeksjoner = seksjoner.filter((s) => s !== nåværendeSeksjon);

  function handleSubmit() {
    if (!valgtSeksjon) return;

    fetcher.submit(
      { handling: "videresend_seksjon", seksjon: valgtSeksjon },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", sakId),
      },
    );
    setValgtSeksjon("");
    onClose();
  }

  function handleClose() {
    setValgtSeksjon("");
    onClose();
  }

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={handleClose}
      header={{
        heading: "Videresend til seksjon",
        icon: <ArrowForwardIcon aria-hidden />,
      }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <BodyShort>
            Saken tilhører nå <strong>{nåværendeSeksjon}</strong>. Velg hvilken seksjon saken skal
            videresendes til.
          </BodyShort>
          <Select
            label="Seksjon"
            value={valgtSeksjon}
            onChange={(e) => setValgtSeksjon(e.target.value)}
          >
            <option value="">Velg seksjon</option>
            {andreSeksjoner.map((seksjon) => (
              <option key={seksjon} value={seksjon}>
                {seksjon}
              </option>
            ))}
          </Select>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleSubmit} disabled={!valgtSeksjon || erSubmitting}>
          Videresend
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
