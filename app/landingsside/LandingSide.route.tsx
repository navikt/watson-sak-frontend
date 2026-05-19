import { Heading, HGrid, Page, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useEffect } from "react";
import { useFetcher, useLoaderData, useRevalidator } from "react-router";
import { Trakt } from "~/alle-saker/Trakt";
import { usePreferences } from "~/preferanser/PreferencesContext";
import type { loader } from "./loader.server";
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
    <Page>
      <title>Dashboard – Watson Sak</title>
      <PageBlock width="xl" gutters>
        <VStack gap="space-16" className="mt-4 mb-8">
          {preferences.visVelkomstmelding ? (
            <Velkomst oppsummering={loaderData.velkomstOppsummering} />
          ) : null}
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

            <section
              aria-labelledby="trakt-heading"
              className="rounded-2xl border border-ax-border-neutral-subtle bg-ax-bg-default p-6"
            >
              <Heading level="2" size="medium" spacing id="trakt-heading">
                Dine saker per steg
              </Heading>
              <Trakt steg={loaderData.traktSteg} />
            </section>
          </HGrid>
        </VStack>
      </PageBlock>
    </Page>
  );
}
