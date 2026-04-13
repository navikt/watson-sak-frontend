import {
  ArrowUndoIcon,
  CheckmarkCircleIcon,
  ClockDashedIcon,
  GavelSoundBlockIcon,
  PersonGroupIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { DelTilgangModal } from "./DelTilgangModal";

interface SakUtredesHandlingerProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
}

type ÅpenModal = "del-tilgang" | null;

export function SakUtredesHandlinger({ sak, saksbehandlere }: SakUtredesHandlingerProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);

  return (
    <>
      <VStack gap="space-8" align="stretch">
        <Heading level="2" size="small">
          Handlinger
        </Heading>
        <Button variant="primary" size="medium" icon={<CheckmarkCircleIcon aria-hidden />}>
          Ferdigstill sak
        </Button>
        <Button
          variant="secondary"
          size="medium"
          icon={<PersonGroupIcon aria-hidden />}
          onClick={() => setÅpenModal("del-tilgang")}
        >
          Del tilgang
        </Button>
        <Button variant="tertiary" size="small" icon={<XMarkOctagonIcon aria-hidden />}>
          Stans ytelse
        </Button>
        <Button variant="tertiary" size="small" icon={<ClockDashedIcon aria-hidden />}>
          Sett i bero
        </Button>
        <Button variant="tertiary" size="small" icon={<GavelSoundBlockIcon aria-hidden />}>
          Opprett anmeldelse
        </Button>
        <Button variant="tertiary" size="small" icon={<ArrowUndoIcon aria-hidden />}>
          Legg tilbake i ufordelt
        </Button>
      </VStack>

      <DelTilgangModal
        sakId={sak.id}
        saksbehandlere={saksbehandlere}
        åpen={åpenModal === "del-tilgang"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
