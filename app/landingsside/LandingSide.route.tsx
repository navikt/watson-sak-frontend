import { VStack } from "@navikt/ds-react";
import { useEffect, useRef } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { LederOversikt } from "~/lederoversikt/LederOversikt";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { usePreferences } from "~/preferanser/PreferencesContext";
import { RouteConfig } from "~/routeConfig";
import { useVarsler, useRefreshVarsler } from "~/varsler/bruk-varsler";
import type { loader } from "./loader.server";
import { SisteVarsler } from "./komponenter/SisteVarsler";
import { FlyttFraAccessBanner } from "./komponenter/FlyttFraAccessBanner";
import { BackendUtilgjengeligMelding } from "~/komponenter/BackendUtilgjengeligMelding";
import { Velkomst } from "./komponenter/Velkomst";
import { SistAktiveSakerOversikt } from "./komponenter/SistAktiveSakerOversikt";

export { action } from "./action.server";
export { loader } from "./loader.server";

export default function LandingSide() {
  const bruker = useInnloggetBruker();
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const prevFetcherState = useRef(fetcher.state);
  const { preferences } = usePreferences();
  const varsler = useVarsler();
  const refreshVarsler = useRefreshVarsler();

  // Refresh varsler etter markering som lest
  useEffect(() => {
    if (prevFetcherState.current !== "idle" && fetcher.state === "idle" && fetcher.data) {
      refreshVarsler();
    }
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, fetcher.data, refreshVarsler]);

  return (
    <>
      <MiljøtilpassetTittel>Oversikt – Watson Sak</MiljøtilpassetTittel>
      <VStack gap="space-12" className="mt-4 mb-8">
        {loaderData.saksdataUtilgjengelig && <BackendUtilgjengeligMelding />}
        {preferences.visVelkomstmelding ? (
          <Velkomst oppsummering={loaderData.velkomstOppsummering} />
        ) : null}

        {loaderData.harSakerSomSkalFlyttes ? <FlyttFraAccessBanner /> : null}

        {!bruker.erLesebruker && (
          <SisteVarsler
            varsler={varsler}
            erSubmitting={fetcher.state !== "idle"}
            onMarkerSomLest={(varselId) => {
              fetcher.submit(
                { varselId },
                { method: "post", action: RouteConfig.API.MARKER_VARSEL_LEST },
              );
            }}
          />
        )}

        {loaderData.type === "leder" ? (
          <LederOversikt statistikk={loaderData.statistikk} />
        ) : loaderData.saksdataUtilgjengelig ? null : (
          <SistAktiveSakerOversikt saker={loaderData.mineSaker} />
        )}
      </VStack>
    </>
  );
}
