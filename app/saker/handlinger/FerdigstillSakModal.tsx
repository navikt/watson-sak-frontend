import { CheckmarkCircleIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Radio, RadioGroup, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { Avslutningskonklusjon } from "~/saker/types.backend";

interface FerdigstillSakModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
  tillatteVerdier?: readonly string[];
}

const avslutningskonklusjonEtiketter: Record<Avslutningskonklusjon, string> = {
  POLITIET_HENLA: "Politiet henla saken",
  FRIFUNNET: "Frifunnet",
  DOMFELT: "Domfelt",
};

const standardAvslutningskonklusjoner = [
  { verdi: "POLITIET_HENLA", etikett: "Politiet henla saken" },
  { verdi: "FRIFUNNET", etikett: "Frifunnet" },
  { verdi: "DOMFELT", etikett: "Domfelt" },
] as const;

export function FerdigstillSakModal({
  sakId,
  åpen,
  onClose,
  tillatteVerdier,
}: FerdigstillSakModalProps) {
  const fetcher = useFetcher();
  const [avslutningskonklusjon, setAvslutningskonklusjon] = useState("");
  const avslutningskonklusjoner =
    tillatteVerdier && tillatteVerdier.length > 0
      ? tillatteVerdier
          .filter(
            (verdi): verdi is Avslutningskonklusjon => verdi in avslutningskonklusjonEtiketter,
          )
          .map((verdi) => ({ verdi, etikett: avslutningskonklusjonEtiketter[verdi] }))
      : standardAvslutningskonklusjoner;

  function handleLukk() {
    onClose();
    setAvslutningskonklusjon("");
  }

  function handleFerdigstill() {
    fetcher.submit(
      {
        handling: "AVSLUTT_MED_KONKLUSJON",
        avslutningskonklusjon,
      },
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
      header={{
        heading: "Ferdigstill sak",
        icon: <CheckmarkCircleIcon aria-hidden />,
      }}
      width="medium"
    >
      <Modal.Body>
        <VStack gap="space-0">
          <VStack gap="space-4" className="pt-2">
            <BodyShort>Velg konklusjon for å avslutte anmeldt sak.</BodyShort>
            <RadioGroup
              legend="Avslutningskonklusjon"
              value={avslutningskonklusjon}
              onChange={setAvslutningskonklusjon}
            >
              {avslutningskonklusjoner.map((konklusjon) => (
                <Radio key={konklusjon.verdi} value={konklusjon.verdi}>
                  {konklusjon.etikett}
                </Radio>
              ))}
            </RadioGroup>
          </VStack>
        </VStack>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="primary" onClick={handleFerdigstill} disabled={!avslutningskonklusjon}>
          Avslutt sak
        </Button>
        <Button variant="secondary" onClick={handleLukk} loading={fetcher.state !== "idle"}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
