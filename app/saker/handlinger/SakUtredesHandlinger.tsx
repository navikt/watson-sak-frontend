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
import { getSaksreferanse } from "~/saker/id";
import type {
  KontrollsakResponse,
  KontrollsakSaksbehandler,
  TilgjengeligHandling,
} from "~/saker/types.backend";
import { formaterDato } from "~/utils/date-utils";
import { DelTilgangModal } from "./DelTilgangModal";
import { FerdigstillSakModal } from "./FerdigstillSakModal";
import { OpprettAnmeldelseModal } from "./OpprettAnmeldelseModal";
import { StansYtelseModal } from "./StansYtelseModal";

interface SakUtredesHandlingerProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  tilgjengeligeHandlinger: TilgjengeligHandling[];
}

type ÅpenModal = "del-tilgang" | "stans-ytelse" | "opprett-anmeldelse" | "ferdigstill" | null;

export function SakUtredesHandlinger({
  sak,
  saksbehandlere: _saksbehandlere,
  saksbehandlerDetaljer,
  tilgjengeligeHandlinger,
}: SakUtredesHandlingerProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);
  const fetcher = useFetcher();

  function sendHandling(handling: TilgjengeligHandling["handling"]) {
    fetcher.submit(
      { handling },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

  const harHandling = (handling: TilgjengeligHandling["handling"]) =>
    tilgjengeligeHandlinger.some(
      (tilgjengeligHandling) => tilgjengeligHandling.handling === handling,
    );

  const avsluttMedKonklusjonHandling = tilgjengeligeHandlinger.find(
    (tilgjengeligHandling) => tilgjengeligHandling.handling === "AVSLUTT_MED_KONKLUSJON",
  );
  const tillatteAvslutningskonklusjoner =
    avsluttMedKonklusjonHandling?.pakrevdeFelter.find(
      (pakrevdFelt) => pakrevdFelt.felt === "avslutningskonklusjon",
    )?.tillatteVerdier ?? [];

  const visSisteAnmeldelse = sak.status === "ANMELDT";

  return (
    <>
      <VStack gap="space-8" align="stretch">
        <Heading level="2" size="small">
          Handlinger
        </Heading>
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
        {harHandling("START_UTREDNING") && (
          <Button
            variant="primary"
            size="medium"
            icon={<CheckmarkCircleIcon aria-hidden />}
            onClick={() => sendHandling("START_UTREDNING")}
          >
            Start utredning
          </Button>
        )}
        {harHandling("SETT_VENTER_PA_INFORMASJON") && (
          <Button
            variant="tertiary"
            size="small"
            onClick={() => sendHandling("SETT_VENTER_PA_INFORMASJON")}
          >
            Sett venter på informasjon
          </Button>
        )}
        {harHandling("SETT_VENTER_PA_VEDTAK") && (
          <Button
            variant="tertiary"
            size="small"
            onClick={() => sendHandling("SETT_VENTER_PA_VEDTAK")}
          >
            Sett venter på vedtak
          </Button>
        )}
        {harHandling("SETT_BERO") && (
          <Button
            variant="tertiary"
            size="small"
            icon={<ClockDashedIcon aria-hidden />}
            onClick={() => sendHandling("SETT_BERO")}
          >
            Sett i bero
          </Button>
        )}
        {harHandling("SETT_ANMELDELSE_VURDERES") && (
          <Button
            variant="tertiary"
            size="small"
            icon={<GavelSoundBlockIcon aria-hidden />}
            onClick={() => sendHandling("SETT_ANMELDELSE_VURDERES")}
          >
            Vurder anmeldelse
          </Button>
        )}
        {harHandling("SETT_ANMELDT") && (
          <VStack gap="space-1">
            <Button
              variant="tertiary"
              size="small"
              icon={<GavelSoundBlockIcon aria-hidden />}
              onClick={() => setÅpenModal("opprett-anmeldelse")}
              aria-describedby={visSisteAnmeldelse ? "anmeldelse-registrert-info" : undefined}
            >
              Opprett anmeldelse
            </Button>
            {visSisteAnmeldelse && (
              <Detail id="anmeldelse-registrert-info" className="pl-8 text-ax-text-neutral-subtle">
                Registrert {formaterDato(sak.oppdatert ?? sak.opprettet)}
              </Detail>
            )}
          </VStack>
        )}
        {harHandling("SETT_HENLAGT") && (
          <Button
            variant="tertiary"
            size="small"
            icon={<XMarkOctagonIcon aria-hidden />}
            onClick={() => sendHandling("SETT_HENLAGT")}
          >
            Henlegg sak
          </Button>
        )}
        {harHandling("FRISTILL") && (
          <Button
            variant="tertiary"
            size="small"
            icon={<ArrowUndoIcon aria-hidden />}
            onClick={() => sendHandling("FRISTILL")}
          >
            Fristill sak
          </Button>
        )}
        {harHandling("AVSLUTT_MED_KONKLUSJON") && (
          <Button
            variant="primary"
            size="medium"
            icon={<CheckmarkCircleIcon aria-hidden />}
            onClick={() => setÅpenModal("ferdigstill")}
          >
            Ferdigstill sak
          </Button>
        )}
        {harHandling("AVSLUTT") && (
          <Button
            variant="primary"
            size="medium"
            icon={<CheckmarkCircleIcon aria-hidden />}
            onClick={() => sendHandling("AVSLUTT")}
          >
            Avslutt sak
          </Button>
        )}
      </VStack>

      <FerdigstillSakModal
        sakId={sak.id}
        åpen={åpenModal === "ferdigstill"}
        onClose={() => setÅpenModal(null)}
        tillatteVerdier={tillatteAvslutningskonklusjoner}
      />
      <DelTilgangModal
        sakId={sak.id}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        åpen={åpenModal === "del-tilgang"}
        onClose={() => setÅpenModal(null)}
      />
      <StansYtelseModal
        sakId={sak.id}
        ytelser={sak.ytelser}
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
