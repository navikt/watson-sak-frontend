import { ArrowLeftIcon, CheckmarkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, HGrid, HStack, VStack } from "@navikt/ds-react";
import { useCallback, useEffect, useState } from "react";
import { isRouteErrorResponse, useLoaderData, useNavigate, useRouteError } from "react-router";
import { Feilmelding } from "~/feilhåndtering/Feilmelding";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { migreringErÅpen } from "~/migrering/miljo";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { useMiljø } from "~/miljø/useMiljø";
import { RouteConfig } from "~/routeConfig";
import { IngenFiltilgangKort } from "./filer/IngenFiltilgangKort";
import { SakFilområde } from "./filer/SakFilområde";
import { erSakseier } from "./handlinger/tilgjengeligeHandlinger";
import { hentHandlinger } from "./handlinger/saksflyt/saksflyt";
import { SaksflytModal } from "./handlinger/saksflyt/SaksflytModal";
import { getSaksreferanse } from "./id";
import { kanEndreSak, kanLasteOppFiler, kanLeseSaksinnhold, kanSeFilområdet } from "./sakstilgang";
import { PersonIdentHistorikkModal } from "./komponenter/PersonIdentHistorikkModal";
import { SakDetaljSidePanel } from "./komponenter/SakDetaljSidePanel";
import { SakerPåSammePerson } from "./komponenter/SakerPåSammePerson";
import { MigreringSjekkliste } from "./komponenter/MigreringSjekkliste";
import { SaksflytStepper } from "./komponenter/SaksflytStepper";
import { SaksinformasjonKort } from "./komponenter/SaksinformasjonKort";
import { getAlder, getNavn } from "./selectors";
import { GosysDokumentpanel } from "./arkiv/GosysDokumentpanel";
import { SakHandlingerKnapper } from "./handlinger/SakHandlingerKnapper";
import { action, loader } from "./SakDetaljSide.server";
import { hentStegbaserteSaksregler } from "./stegregler";
import { useLukketBekreftelse } from "./useLukketBekreftelse";
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
    migreringsstatus,
    migreringsnotatEksempel,
    mapper,
    andreSaker,
    andreSakerSide,
    saksbehandlerDetaljer,
    seksjonsfeil,
  } = useLoaderData<typeof loader>();
  const [sak, setSak] = useState(loaderSak);
  const { vis: visEksempelBekreftelse, lukk: lukkBekreftelse } = useLukketBekreftelse(loaderSak.id);
  const [visSaksflytModal, setVisSaksflytModal] = useState(false);
  const navigate = useNavigate();
  const tilbake = useTilbakeLenke({ to: RouteConfig.MINE_SAKER, label: "Mine saker" });
  const innloggetBruker = useInnloggetBruker();
  const identHistorikkModal = useDisclosure();
  const miljø = useMiljø();
  const stegregler = hentStegbaserteSaksregler(sak.steg);
  const erEier = erSakseier(sak, innloggetBruker.navIdent);
  const tilgjengeligeSteg =
    erEier && tillatteHandlinger
      ? hentHandlinger(tillatteHandlinger).flatMap((handling) =>
          handling.innsending.handling === "endre_steg_dialog" ? [handling.innsending.steg] : [],
        )
      : [];
  const erFerdigMigrert =
    (miljø === "local-mock" || migreringErÅpen(miljø)) &&
    erEier &&
    sak.legacyPid &&
    migreringsstatus === "FULLSTENDIG";
  const harDirekteTilgang = kanEndreSak(sak, innloggetBruker);
  const kanLese = kanLeseSaksinnhold(sak, innloggetBruker);
  const historikkTilstand: "vis" | "ikke-delt" | "ingen-persontilgang" = !kanLese
    ? "ikke-delt"
    : (sak.tilgang?.kanSeHistorikk ?? true)
      ? "vis"
      : "ingen-persontilgang";
  const filTilstand: "vis" | "ikke-delt" | "ingen-persontilgang" = !kanSeFilområdet(
    sak,
    innloggetBruker,
  )
    ? "ikke-delt"
    : (sak.tilgang?.kanSeFiler ?? true)
      ? "vis"
      : "ingen-persontilgang";
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
            xl: "minmax(0, 1fr) 400px",
          }}
          gap="space-16"
        >
          <VStack gap="space-8">
            {seksjonsfeil.tillatteHandlinger && (
              <Feilmelding
                headingLevel="2"
                tittel="Vi fikk ikke hentet handlingene du kan gjøre på saken"
                feilId={seksjonsfeil.tillatteHandlinger}
                kanPrøveIgjen
              >
                Du kan lese saken, men ikke endre steg, status eller resultat før vi får hentet
                dette. Prøv igjen om litt.
              </Feilmelding>
            )}
            <SaksflytStepper
              steg={sak.steg}
              resultat={sak.resultat}
              tilgjengeligeSteg={tilgjengeligeSteg}
              onEndreSteg={
                tilgjengeligeSteg.length > 0 ? () => setVisSaksflytModal(true) : undefined
              }
            />

            <SaksinformasjonKort
              sak={sak}
              tittel={tittel}
              kanRedigere={kanRedigere}
              onVisIdentHistorikk={identHistorikkModal.onÅpne}
              onSakOppdatert={onSakOppdatert}
            />

            {sak.legacyPid &&
              sak.legacyKilde &&
              erEier &&
              (miljø === "local-mock" || migreringErÅpen(miljø)) &&
              (erFerdigMigrert ? (
                visEksempelBekreftelse && (
                  <Box
                    background="success-soft"
                    borderColor="success"
                    borderWidth="1"
                    borderRadius="8"
                    padding="space-16"
                    role="status"
                  >
                    <HStack align="start" gap="space-8">
                      <Box background="success-strong" borderRadius="4" padding="space-4">
                        <CheckmarkIcon
                          fontSize="1rem"
                          className="text-ax-text-success-contrast"
                          aria-hidden
                        />
                      </Box>
                      <VStack gap="space-4" className="min-w-0 flex-1">
                        <BodyShort weight="semibold">Saken er ferdig flyttet 🎉</BodyShort>
                        <BodyShort size="small">Saken er overført til Watson Sak.</BodyShort>
                        {miljø === "local-mock" && (
                          <BodyShort size="small" textColor="subtle">
                            Syntetisk eksempel, ingen ferdigmelding er lagret i backend.
                          </BodyShort>
                        )}
                      </VStack>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="xsmall"
                        icon={<XMarkIcon aria-hidden />}
                        aria-label="Lukk bekreftelsen"
                        onClick={lukkBekreftelse}
                      />
                    </HStack>
                  </Box>
                )
              ) : (
                <MigreringSjekkliste
                  kanLagres={migreringErÅpen(miljø) && migreringsstatus === "UNDER_MIGRERING"}
                />
              ))}

            {filTilstand === "vis" && seksjonsfeil.filer ? (
              <Feilmelding
                headingLevel="2"
                tittel="Vi fikk ikke hentet filene på saken"
                feilId={seksjonsfeil.filer}
                kanPrøveIgjen
              >
                Resten av saken kan du bruke som vanlig. Prøv igjen om litt.
              </Feilmelding>
            ) : filTilstand === "vis" ? (
              <SakFilområde
                dokumenter={dokumenter}
                filer={filer}
                mapper={mapper}
                sakId={saksreferanse}
                steg={sak.steg}
                redigerbar={harDirekteTilgang && stegregler.kanRedigereDokumenter}
                kanLasteOppFiler={
                  kanLasteOppFiler(sak, innloggetBruker) && stegregler.kanLasteOppFiler
                }
                kanEndreFiler={harDirekteTilgang && stegregler.kanLasteOppFiler}
                migreringsnotatEksempel={migreringsnotatEksempel}
                visMigreringsnotatForhandsvisning={Boolean(
                  sak.legacyPid &&
                  sak.legacyKilde &&
                  miljø === "local-mock" &&
                  !migreringsnotatEksempel,
                )}
              />
            ) : (
              <IngenFiltilgangKort årsak={filTilstand} />
            )}

            <GosysDokumentpanel
              key={sak.id}
              sakId={saksreferanse}
              saksreferanse={saksreferanse}
              kanSeArkiv={sak.tilgang?.kanSeArkiv ?? false}
              renderHandlinger={({ onJournalpostOpprettet, arkiv }) => (
                <SakHandlingerKnapper
                  sak={sak}
                  erEier={erEier}
                  filer={filer}
                  dokumenter={dokumenter}
                  onJournalpostOpprettet={onJournalpostOpprettet}
                  arkiv={arkiv}
                />
              )}
            />

            {seksjonsfeil.andreSaker && (
              <Feilmelding
                headingLevel="2"
                tittel="Vi fikk ikke hentet andre saker på personen"
                feilId={seksjonsfeil.andreSaker}
                kanPrøveIgjen
              >
                Resten av saken kan du bruke som vanlig. Prøv igjen om litt.
              </Feilmelding>
            )}
            <SakerPåSammePerson
              saker={andreSaker}
              side={andreSakerSide.side}
              totalSider={andreSakerSide.totalSider}
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
            erEier={erEier}
            kanTildeleSak={sak.tilgang?.kanTildeleSak ?? true}
            kanRedigere={kanRedigere}
            kanLeggeTilHistorikk={erEier && stegregler.kanLeggeTilHistorikk}
            historikkTilstand={historikkTilstand}
            seksjonsfeil={seksjonsfeil}
          />
        </HGrid>
      </VStack>

      <PersonIdentHistorikkModal
        sak={sak}
        åpen={identHistorikkModal.erÅpen}
        onClose={identHistorikkModal.onLukk}
      />
      {tillatteHandlinger && visSaksflytModal && (
        <SaksflytModal
          sakId={String(sak.id)}
          tillatteHandlinger={tillatteHandlinger}
          start="meny"
          onClose={() => setVisSaksflytModal(false)}
        />
      )}
    </>
  );
}

/**
 * Vises når saken eller innlogget bruker ikke kunne hentes. Siden gir ikke mening uten dem,
 * men menyen og headeren står igjen. 401, 403, 404 og 429 går videre til rot-boundary som før.
 */
export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status < 500) {
    throw error;
  }
  const feilId =
    isRouteErrorResponse(error) && typeof error.data?.feilId === "string"
      ? error.data.feilId
      : undefined;
  return (
    <VStack gap="space-12" className="mt-4 mb-8">
      <MiljøtilpassetTittel>Feil – Watson Sak</MiljøtilpassetTittel>
      <Feilmelding
        tittel="Vi fikk ikke hentet saken"
        feilId={feilId}
        size="medium"
        headingLevel="2"
        kanPrøveIgjen
      >
        Dette er en teknisk feil hos oss, ikke noe du har gjort. Prøv igjen om litt.
      </Feilmelding>
    </VStack>
  );
}
