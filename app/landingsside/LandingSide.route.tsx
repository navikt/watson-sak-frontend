import { BodyShort, Heading, HGrid, HStack, VStack } from "@navikt/ds-react";
import { BarChartIcon } from "@navikt/aksel-icons";
import { useEffect, useRef } from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import { Trakt } from "~/alle-saker/Trakt";
import { Kort } from "~/komponenter/Kort";
import { usePreferences } from "~/preferanser/PreferencesContext";
import { RouteConfig } from "~/routeConfig";
import { useVarsler } from "~/varsler/bruk-varsler";
import type { loader } from "./loader.server";
import { DashboardNokkeltallKort } from "./komponenter/DashboardNokkeltallKort";
import { SisteVarsler } from "./komponenter/SisteVarsler";
import { Velkomst } from "./komponenter/Velkomst";
import { MineSakerOversikt } from "./komponenter/MineSakerOversikt";

export { action } from "./action.server";
export { loader } from "./loader.server";

export default function LandingSide() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { revalidate } = useRevalidator();
  const prevFetcherState = useRef(fetcher.state);
  const { preferences } = usePreferences();
  const varsler = useVarsler();

  // Revalider AppLayout-loaderen manuelt etter markering som lest.
  // API-ruten er utenfor layout-treet, så React Router gjør ikke dette automatisk.
  useEffect(() => {
    if (prevFetcherState.current !== "idle" && fetcher.state === "idle" && fetcher.data) {
      revalidate();
    }
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, fetcher.data, revalidate]);

  return (
    <>
      <title>Dashboard – Watson Sak</title>
      <VStack gap="space-12" className="mt-4 mb-8">
        {preferences.visVelkomstmelding ? (
          <Velkomst oppsummering={loaderData.velkomstOppsummering} />
        ) : null}
        <DashboardNokkeltallKort nokkeltall={loaderData.dashboardNokkeltall} />
        <MineSakerOversikt saker={loaderData.mineSaker} />

        <HGrid columns={{ xs: 1, md: 2 }} gap="space-6">
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

          <Kort as="section" aria-labelledby="trakt-heading">
            <VStack gap="space-4">
              <HStack gap="space-4" align="center">
                <BarChartIcon aria-hidden fontSize="1.25rem" />
                <Heading level="2" size="medium" id="trakt-heading">
                  Dine saker siste 30 dager
                </Heading>
              </HStack>
              {loaderData.traktSteg.length > 0 ? (
                <Trakt steg={loaderData.traktSteg} />
              ) : (
                <BodyShort className="text-ax-text-neutral-subtle">
                  Du har ikke jobbet på noen saker de siste 30 dagene.
                </BodyShort>
              )}
            </VStack>
          </Kort>
        </HGrid>
      </VStack>
    </>
  );
}
