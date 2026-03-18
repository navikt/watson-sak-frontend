import { Page, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useFetcher, useLoaderData } from "react-router";
import type { loader } from "./loader.server";
import { SisteVarsler } from "./komponenter/SisteVarsler";
import { Velkomst } from "./komponenter/Velkomst";
import { MineSakerOversikt } from "./komponenter/MineSakerOversikt";

export { action } from "./action.server";
export { loader } from "./loader.server";

export default function LandingSide() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  return (
    <Page>
      <title>Dashboard – Watson Sak</title>
      <PageBlock width="xl" gutters>
        <VStack gap="space-16" className="mt-4 mb-8">
          <Velkomst />
          <MineSakerOversikt saker={loaderData.mineSaker} />
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
        </VStack>
      </PageBlock>
    </Page>
  );
}
