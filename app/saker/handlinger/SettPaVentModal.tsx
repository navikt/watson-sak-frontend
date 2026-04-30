import { ClockDashedIcon } from "@navikt/aksel-icons";
import { Button, Modal, Radio, RadioGroup, Textarea, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { Blokkeringsarsak } from "~/saker/types.backend";
import { formaterBlokkeringsarsak } from "~/saker/visning";

interface SettPaVentModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

const blokkeringsårsaker: Blokkeringsarsak[] = [
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "I_BERO",
];

export function SettPaVentModal({ sakId, åpen, onClose }: SettPaVentModalProps) {
  const fetcher = useFetcher();
  const [valgtÅrsak, setValgtÅrsak] = useState<string>("");
  const [beskrivelse, setBeskrivelse] = useState("");
  const erSubmitting = fetcher.state !== "idle";

  function handleLukk() {
    if (erSubmitting) return;
    setValgtÅrsak("");
    setBeskrivelse("");
    onClose();
  }

  function handleLagre() {
    if (!valgtÅrsak || erSubmitting) return;

    fetcher.submit(
      { handling: "endre_blokkering", blokkert: valgtÅrsak, beskrivelse },
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
      header={{ heading: "Sett på vent", icon: <ClockDashedIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <RadioGroup legend="Årsak til venting" value={valgtÅrsak} onChange={setValgtÅrsak}>
            {blokkeringsårsaker.map((årsak) => (
              <Radio key={årsak} value={årsak}>
                {formaterBlokkeringsarsak(årsak)}
              </Radio>
            ))}
          </RadioGroup>
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
          disabled={!valgtÅrsak || erSubmitting}
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
