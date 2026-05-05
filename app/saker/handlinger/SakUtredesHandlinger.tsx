import { ClockDashedIcon, DocPencilIcon, PencilIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { EndreStatusModal } from "./EndreStatusModal";
import { OpprettNotatModal } from "./OpprettNotatModal";
import { SettPaVentModal } from "./SettPaVentModal";

interface SakUtredesHandlingerProps {
  sak: KontrollsakResponse;
}

type ÅpenModal = "endre-status" | "sett-pa-vent" | "send-notat" | null;

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

        <hr className="my-4 border-ax-border-neutral-subtle" />

        <Button
          variant="secondary-neutral"
          size="medium"
          icon={<DocPencilIcon aria-hidden />}
          onClick={() => setÅpenModal("send-notat")}
        >
          Opprett notat
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
      <OpprettNotatModal
        sakId={sak.id}
        åpen={åpenModal === "send-notat"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
