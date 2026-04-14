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
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { DelTilgangModal } from "./DelTilgangModal";
import { StansYtelseModal } from "./StansYtelseModal";

interface SakUtredesHandlingerProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
}

type ÅpenModal = "del-tilgang" | "stans-ytelse" | null;

export function SakUtredesHandlinger({ sak, saksbehandlere }: SakUtredesHandlingerProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);
  const beroFetcher = useFetcher();

  function handleSettIBero() {
    beroFetcher.submit(
      { handling: "sett_i_bero" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

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
        <Button
          variant="tertiary"
          size="small"
          icon={<XMarkOctagonIcon aria-hidden />}
          onClick={() => setÅpenModal("stans-ytelse")}
        >
          Stans ytelse
        </Button>
        <Button
          variant="tertiary"
          size="small"
          icon={<ClockDashedIcon aria-hidden />}
          onClick={handleSettIBero}
          loading={beroFetcher.state !== "idle"}
        >
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
      <StansYtelseModal
        sakId={sak.id}
        åpen={åpenModal === "stans-ytelse"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
