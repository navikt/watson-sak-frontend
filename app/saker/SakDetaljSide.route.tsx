import { ArrowLeftIcon, CheckmarkIcon, XMarkIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Checkbox, HGrid, HStack, VStack } from "@navikt/ds-react";
import { useCallback, useEffect, useState } from "react";
import { Form, useLoaderData, useNavigate } from "react-router";
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
import { harDirekteSakstilgang, kanLeseSaksinnhold } from "./sakstilgang";
import { PersonIdentHistorikkModal } from "./komponenter/PersonIdentHistorikkModal";
import { SakDetaljSidePanel } from "./komponenter/SakDetaljSidePanel";
import { SakerPåSammePerson } from "./komponenter/SakerPåSammePerson";
import { SaksflytStepper } from "./komponenter/SaksflytStepper";
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

const FERDIG_FLYTTET_BESKRIVELSE =
  "Marker saken som ferdig flyttet når alle dokumenter og detaljer fra saken er flyttet fra Access og filområdet over til Watson Sak.";

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
    journalposter,
    andreSaker,
    saksbehandlerDetaljer,
  } = useLoaderData<typeof loader>();
  const [sak, setSak] = useState(loaderSak);
  const [visEksempelBekreftelse, setVisEksempelBekreftelse] = useState(true);
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
  const harDirekteTilgang = harDirekteSakstilgang(sak, innloggetBruker);
  const kanLese = kanLeseSaksinnhold(sak, innloggetBruker);
  const historikkTilstand: "vis" | "ikke-delt" | "skjermet" = !kanLese
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
    setVisEksempelBekreftelse(true);
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
                        onClick={() => setVisEksempelBekreftelse(false)}
                      />
                    </HStack>
                  </Box>
                )
              ) : (
                <Box
                  background="info-soft"
                  borderColor="info-subtle"
                  borderWidth="1"
                  borderRadius="8"
                  padding="space-12"
                >
                  {migreringErÅpen(miljø) && migreringsstatus === "UNDER_MIGRERING" ? (
                    <Form method="post">
                      <input type="hidden" name="handling" value="MIGRERING_FERDIGSTILL" />
                      <Checkbox
                        name="bekreftet"
                        value="ja"
                        description={FERDIG_FLYTTET_BESKRIVELSE}
                        onChange={(event) => {
                          // Figma 3–4: avkrysningen er selve ferdigmeldingen, ingen egen knapp.
                          if (event.currentTarget.checked)
                            event.currentTarget.form?.requestSubmit();
                        }}
                      >
                        Saken er ferdig flyttet
                      </Checkbox>
                    </Form>
                  ) : (
                    <>
                      <Checkbox disabled readOnly description={FERDIG_FLYTTET_BESKRIVELSE}>
                        Saken er ferdig flyttet
                      </Checkbox>
                      <BodyShort size="small" textColor="subtle">
                        Forhåndsvisning. Ferdigmerking kan ikke lagres ennå.
                      </BodyShort>
                    </>
                  )}
                </Box>
              ))}

            {kanLese ? (
              <SakFilområde
                dokumenter={dokumenter}
                filer={filer}
                mapper={mapper}
                journalposter={journalposter}
                sakId={saksreferanse}
                redigerbar={harDirekteTilgang && stegregler.kanRedigereDokumenter}
                kanLasteOppFiler={harDirekteTilgang && stegregler.kanLasteOppFiler}
                erSakseier={erEier}
                migreringsnotatEksempel={migreringsnotatEksempel}
                visMigreringsnotatForhandsvisning={Boolean(
                  sak.legacyPid &&
                  sak.legacyKilde &&
                  miljø === "local-mock" &&
                  !migreringsnotatEksempel,
                )}
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
