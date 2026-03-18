import { Page, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import type { loader } from "./loader.server";
import { Velkomst } from "./komponenter/Velkomst";
import { MineSakerOversikt } from "./komponenter/MineSakerOversikt";

export { loader } from "./loader.server";

export default function LandingSide() {
  const data = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Dashboard – Watson Sak</title>
      <PageBlock width="xl" gutters>
        <VStack gap="space-16" className="mt-4 mb-8">
          <Velkomst />
          <MineSakerOversikt saker={data.mineSaker} />
        </VStack>
      </PageBlock>
    </Page>
  );
}
