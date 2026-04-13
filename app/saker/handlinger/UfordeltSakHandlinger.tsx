import { ArrowForwardIcon, PersonPencilIcon, PersonPlusIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getSaksreferanse } from "~/saker/id";
import { RouteConfig } from "~/routeConfig";
import { TildelSaksbehandlerModal } from "./TildelSaksbehandlerModal";

interface UfordeltSakHandlingerProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
  seksjoner: string[];
}

type ÅpenModal = "tildel" | null;

export function UfordeltSakHandlinger({
  sak,
  saksbehandlere,
  seksjoner: _seksjoner,
}: UfordeltSakHandlingerProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);
  const innloggetBruker = useInnloggetBruker();
  const tildelMegFetcher = useFetcher();

  function handleTildelMeg() {
    tildelMegFetcher.submit(
      { handling: "tildel", saksbehandler: innloggetBruker.navIdent },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

  return (
    <>
      <VStack gap="space-4" align="stretch">
        <Heading level="2" size="small">
          Handlinger
        </Heading>
        <Button
          variant="primary"
          size="small"
          icon={<PersonPencilIcon aria-hidden />}
          onClick={() => setÅpenModal("tildel")}
        >
          Tildel saksbehandler
        </Button>
        <Button
          variant="secondary"
          size="small"
          icon={<PersonPlusIcon aria-hidden />}
          onClick={handleTildelMeg}
          loading={tildelMegFetcher.state !== "idle"}
        >
          Tildel meg
        </Button>
        <Button variant="secondary" size="small" icon={<ArrowForwardIcon aria-hidden />} disabled>
          Send til annen enhet
        </Button>
      </VStack>

      <TildelSaksbehandlerModal
        sakId={sak.id}
        saksbehandlere={saksbehandlere}
        åpen={åpenModal === "tildel"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
