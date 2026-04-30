import { PencilIcon } from "@navikt/aksel-icons";
import { Button, Modal, Select, Textarea, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakStatus } from "~/saker/types.backend";
import { formaterStatus } from "~/saker/visning";

interface EndreStatusModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

const valgbareStatuser: KontrollsakStatus[] = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
];

export function EndreStatusModal({ sakId, åpen, onClose }: EndreStatusModalProps) {
  const fetcher = useFetcher();
  const [valgtStatus, setValgtStatus] = useState<string>("");
  const [beskrivelse, setBeskrivelse] = useState("");
  const erSubmitting = fetcher.state !== "idle";

  function handleLukk() {
    if (erSubmitting) return;
    setValgtStatus("");
    setBeskrivelse("");
    onClose();
  }

  function handleLagre() {
    if (!valgtStatus || erSubmitting) return;

    fetcher.submit(
      { handling: "endre_status", status: valgtStatus, beskrivelse },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      },
    );
    handleLukk();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={{ heading: "Endre status", icon: <PencilIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <Select
            label="Ny status"
            value={valgtStatus}
            onChange={(event) => setValgtStatus(event.target.value)}
          >
            <option value="">Velg status</option>
            {valgbareStatuser.map((status) => (
              <option key={status} value={status}>
                {formaterStatus(status)}
              </option>
            ))}
          </Select>
          <Textarea
            label="Beskrivelse (valgfritt)"
            value={beskrivelse}
            onChange={(event) => setBeskrivelse(event.target.value)}
            minRows={2}
            maxRows={5}
          />
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          onClick={handleLagre}
          disabled={!valgtStatus || erSubmitting}
          loading={erSubmitting}
        >
          Lagre
        </Button>
        <Button variant="secondary" onClick={handleLukk} disabled={erSubmitting}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
