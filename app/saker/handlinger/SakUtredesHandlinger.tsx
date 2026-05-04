import { ClockDashedIcon, PencilIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { EndreStatusModal } from "./EndreStatusModal";
import { SettPaVentModal } from "./SettPaVentModal";

interface SakUtredesHandlingerProps {
  sak: KontrollsakResponse;
}

type ÅpenModal = "endre-status" | "sett-pa-vent" | null;

export function SakUtredesHandlinger({ sak }: SakUtredesHandlingerProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);

  return (
    <>
      <VStack gap="space-4" align="stretch">
        <Heading level="2" size="small">
          Handlinger
        </Heading>
        <Button
          variant="primary"
          size="medium"
          icon={<PencilIcon aria-hidden />}
          onClick={() => setÅpenModal("endre-status")}
        >
          Endre status
        </Button>
        <Button
          variant="secondary"
          size="medium"
          icon={<ClockDashedIcon aria-hidden />}
          onClick={() => setÅpenModal("sett-pa-vent")}
        >
          Sett på vent
        </Button>
      </VStack>

      <EndreStatusModal
        sakId={sak.id}
        nåværendeStatus={sak.status}
        åpen={åpenModal === "endre-status"}
        onClose={() => setÅpenModal(null)}
      />
      <SettPaVentModal
        sakId={sak.id}
        åpen={åpenModal === "sett-pa-vent"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
