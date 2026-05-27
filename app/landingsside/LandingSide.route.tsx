import { BodyShort, Heading, HGrid, HStack, VStack } from "@navikt/ds-react";
import { useEffect } from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import { BarChartIcon } from "@navikt/aksel-icons";
import { Trakt } from "~/alle-saker/Trakt";
import { Kort } from "~/komponenter/Kort";
import { usePreferences } from "~/preferanser/PreferencesContext";
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
  const revalidator = useRevalidator();
  const { preferences } = usePreferences();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  return (
    <>
      <title>Dashboard – Watson Sak</title>
      <VStack gap="space-16" className="mt-4 mb-8">
        {preferences.visVelkomstmelding ? (
          <Velkomst oppsummering={loaderData.velkomstOppsummering} />
        ) : null}
        <DashboardNokkeltallKort nokkeltall={loaderData.dashboardNokkeltall} />
        <MineSakerOversikt saker={loaderData.mineSaker} />

        <HGrid columns={{ xs: 1, md: 2 }} gap="space-6">
          <SisteVarsler
            varsler={loaderData.varsler}
            erSubmitting={fetcher.state !== "idle"}
            onMarkerSomLest={(varselId) => {
              fetcher.submit(
                { handling: "marker_varsel_som_lest", varselId },
                {
                  method: "post",
                },
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
