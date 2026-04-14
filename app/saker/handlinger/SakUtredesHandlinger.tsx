import {
  ArrowUndoIcon,
  CheckmarkCircleIcon,
  ClockDashedIcon,
  GavelSoundBlockIcon,
  PersonGroupIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { Button, Detail, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import type { FilNode } from "~/saker/filer/typer";
import { getSaksreferanse } from "~/saker/id";
import type { SakHendelse } from "~/saker/historikk/typer";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { formaterDato } from "~/utils/date-utils";
import { DelTilgangModal } from "./DelTilgangModal";
import { FerdigstillSakModal } from "./FerdigstillSakModal";
import { OpprettAnmeldelseModal } from "./OpprettAnmeldelseModal";
import { StansYtelseModal } from "./StansYtelseModal";

interface SakUtredesHandlingerProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
  historikk: SakHendelse[];
  filer: FilNode[];
}

type ÅpenModal = "del-tilgang" | "stans-ytelse" | "opprett-anmeldelse" | "ferdigstill" | null;

export function SakUtredesHandlinger({
  sak,
  saksbehandlere,
  historikk,
  filer,
}: SakUtredesHandlingerProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);
  const beroFetcher = useFetcher();
  const tilbakeFetcher = useFetcher();

  const sisteAnmeldelse = historikk.find((h) => h.hendelsesType === "POLITIANMELDT");
  const erAlleredeAnmeldt = sisteAnmeldelse !== undefined;

  function handleSettIBero() {
    beroFetcher.submit(
      { handling: "sett_i_bero" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

  function handleLeggTilbakeIUfordelt() {
    tilbakeFetcher.submit(
      { handling: "legg_tilbake_i_ufordelt" },
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
        <Button
          variant="primary"
          size="medium"
          icon={<CheckmarkCircleIcon aria-hidden />}
          onClick={() => setÅpenModal("ferdigstill")}
        >
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
        <VStack gap="space-1">
          <Button
            variant="tertiary"
            size="small"
            icon={<GavelSoundBlockIcon aria-hidden />}
            onClick={() => setÅpenModal("opprett-anmeldelse")}
            disabled={erAlleredeAnmeldt}
            aria-describedby={erAlleredeAnmeldt ? "anmeldelse-registrert-info" : undefined}
          >
            Opprett anmeldelse
          </Button>
          {erAlleredeAnmeldt && sisteAnmeldelse && (
            <Detail id="anmeldelse-registrert-info" className="pl-8 text-ax-text-neutral-subtle">
              Registrert {formaterDato(sisteAnmeldelse.tidspunkt)}
            </Detail>
          )}
        </VStack>
        <Button
          variant="tertiary"
          size="small"
          icon={<ArrowUndoIcon aria-hidden />}
          onClick={handleLeggTilbakeIUfordelt}
          loading={tilbakeFetcher.state !== "idle"}
        >
          Legg tilbake i ufordelt
        </Button>
      </VStack>

      <FerdigstillSakModal
        sakId={sak.id}
        filer={filer}
        historikk={historikk}
        åpen={åpenModal === "ferdigstill"}
        onClose={() => setÅpenModal(null)}
      />
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
      <OpprettAnmeldelseModal
        sakId={sak.id}
        åpen={åpenModal === "opprett-anmeldelse"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
