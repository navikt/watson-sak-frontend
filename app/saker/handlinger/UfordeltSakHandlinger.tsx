import { ArrowForwardIcon, PersonPencilIcon, PersonPlusIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import type { KontrollsakResponse, KontrollsakSaksbehandler } from "~/saker/types.backend";
import { getSaksreferanse } from "~/saker/id";
import { RouteConfig } from "~/routeConfig";
import { EndreStatusModal } from "./EndreStatusModal";
import { TildelSaksbehandlerModal } from "./TildelSaksbehandlerModal";
import { SettPaVentModal } from "./SettPaVentModal";

interface UfordeltSakHandlingerProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  seksjoner: string[];
}

type ÅpenModal = "tildel" | "endre-status" | "sett-pa-vent" | null;

export function UfordeltSakHandlinger({
  sak,
  saksbehandlere,
  saksbehandlerDetaljer,
  seksjoner: _seksjoner,
}: UfordeltSakHandlingerProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);
  const innloggetBruker = useInnloggetBruker();
  const tildelMegFetcher = useFetcher();

  function handleTildelMeg() {
    tildelMegFetcher.submit(
      { handling: "TILDEL", navIdent: innloggetBruker.navIdent, navn: innloggetBruker.name },
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
        <Button variant="primary" size="medium" onClick={() => setÅpenModal("endre-status")}>
          Endre status
        </Button>
        <Button variant="secondary" size="medium" onClick={() => setÅpenModal("sett-pa-vent")}>
          Sett på vent
        </Button>
        <Button
          variant="secondary"
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

      <EndreStatusModal
        sakId={sak.id}
        åpen={åpenModal === "endre-status"}
        onClose={() => setÅpenModal(null)}
      />
      <TildelSaksbehandlerModal
        sakId={sak.id}
        saksbehandlere={saksbehandlere}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        åpen={åpenModal === "tildel"}
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
