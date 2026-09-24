import { ArrowLeftIcon } from "@navikt/aksel-icons";
import { Button, HGrid, VStack } from "@navikt/ds-react";
import { useCallback, useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { IngenFiltilgangKort } from "./filer/IngenFiltilgangKort";
import { SakFilområde } from "./filer/SakFilområde";
import { erSakseier } from "./handlinger/tilgjengeligeHandlinger";
import { getSaksreferanse } from "./id";
import { PersonIdentHistorikkModal } from "./komponenter/PersonIdentHistorikkModal";
import { SakDetaljSidePanel } from "./komponenter/SakDetaljSidePanel";
import { SakerPåSammePerson } from "./komponenter/SakerPåSammePerson";
import { SaksinformasjonKort } from "./komponenter/SaksinformasjonKort";
import { getAlder, getNavn } from "./selectors";
import { action, loader } from "./SakDetaljSide.server";
import { hentStegbaserteSaksregler } from "./stegregler";
import { useTilbakeLenke } from "./tilbake";
import type { KontrollsakResponse, KontrollsakSaksbehandler } from "./types.backend";
import { useDisclosure } from "~/utils/useDisclosure";

export { action, loader };

export const handle = { editorGutters: true };

function finnSaksbehandlerDetalj(
  saksbehandlerDetaljer: KontrollsakSaksbehandler[],
  navIdent: string,
) {
  return (
    saksbehandlerDetaljer.find(
      (saksbehandler) => saksbehandler.navIdent === navIdent || saksbehandler.navn === navIdent,
    ) ?? null
  );
}

export default function SakDetaljSide() {
  const {
    sak: loaderSak,
    tillatteHandlinger,
    historikk,
    dokumenter,
    filer,
    andreSaker,
    saksbehandlerDetaljer,
  } = useLoaderData<typeof loader>();
  const [sak, setSak] = useState(loaderSak);
  const navigate = useNavigate();
  const tilbake = useTilbakeLenke({ to: RouteConfig.MINE_SAKER, label: "Mine saker" });
  const innloggetBruker = useInnloggetBruker();
  const identHistorikkModal = useDisclosure();
  const stegregler = hentStegbaserteSaksregler(sak.steg);
  const erEier = erSakseier(sak, innloggetBruker.navIdent);
  const harDeltTilgang = sak.saksbehandlere.deltMed.some(
    (saksbehandler) => saksbehandler.navIdent === innloggetBruker.navIdent,
  );
  const harDirekteTilgang = erEier || harDeltTilgang || innloggetBruker.erLeder;
  const historikkTilstand: "vis" | "ikke-delt" | "skjermet" = !harDirekteTilgang
    ? "ikke-delt"
    : (sak.tilgang?.kanSeHistorikk ?? true)
      ? "vis"
      : "skjermet";
  const saksreferanse = getSaksreferanse(sak.id);
  const navn = getNavn(sak);
  const alder = getAlder(sak);
  const tittel = navn
    ? `Sak ${saksreferanse} – ${navn}${alder !== null ? ` (${alder})` : ""}`
    : `Sak ${saksreferanse}`;
  const ansvarligSaksbehandler = sak.saksbehandlere.eier
    ? finnSaksbehandlerDetalj(saksbehandlerDetaljer, sak.saksbehandlere.eier.navIdent)
    : null;
  const kanRedigere = erEier && stegregler.erAktiv;
  const onSakOppdatert = useCallback((oppdatertSak: KontrollsakResponse) => {
    setSak(oppdatertSak);
  }, []);

  useEffect(() => {
    setSak(loaderSak);
  }, [loaderSak]);

  return (
    <>
      <MiljøtilpassetTittel>{`Sak ${saksreferanse} – Watson Sak`}</MiljøtilpassetTittel>
      <VStack gap="space-12" className="mt-4 mb-8">
        <div>
          <Button
            type="button"
            variant="tertiary"
            size="small"
            icon={<ArrowLeftIcon aria-hidden />}
            onClick={() => navigate(tilbake.to)}
          >
            Tilbake til {tilbake.label}
          </Button>
        </div>

        <HGrid
          columns={{
            xs: 1,
            md: "minmax(0, 1fr) 300px",
            lg: "minmax(0, 1fr) 260px",
            xl: "minmax(0, 1fr) 300px",
          }}
          gap="space-16"
        >
          <VStack gap="space-8">
            <SaksinformasjonKort
              sak={sak}
              tittel={tittel}
              kanRedigere={kanRedigere}
              onVisIdentHistorikk={identHistorikkModal.onÅpne}
              onSakOppdatert={onSakOppdatert}
            />

            {harDirekteTilgang ? (
              <SakFilområde
                dokumenter={dokumenter}
                filer={filer}
                sakId={saksreferanse}
                redigerbar={harDirekteTilgang && stegregler.kanRedigereDokumenter}
                kanLasteOppFiler={harDirekteTilgang && stegregler.kanLasteOppFiler}
                erSakseier={erEier}
              />
            ) : (
              <IngenFiltilgangKort />
            )}

            <SakerPåSammePerson
              saker={andreSaker}
              gjeldendeSak={sak}
              innloggetNavIdent={innloggetBruker.navIdent}
            />
          </VStack>

          <SakDetaljSidePanel
            sak={sak}
            saksbehandlerDetaljer={saksbehandlerDetaljer}
            ansvarligSaksbehandler={ansvarligSaksbehandler}
            tillatteHandlinger={tillatteHandlinger}
            historikk={historikk}
            dokumenter={dokumenter}
            filer={filer}
            erEier={erEier}
            kanTildeleSak={sak.tilgang?.kanTildeleSak ?? true}
            kanRedigere={kanRedigere}
            kanLeggeTilHistorikk={erEier && stegregler.kanLeggeTilHistorikk}
            historikkTilstand={historikkTilstand}
          />
        </HGrid>
      </VStack>

      <PersonIdentHistorikkModal
        sak={sak}
        åpen={identHistorikkModal.erÅpen}
        onClose={identHistorikkModal.onLukk}
      />
    </>
  );
}
