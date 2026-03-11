import { Heading, Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { SaksListe } from "~/saker/SaksListe";
import { RouteConfig } from "~/routeConfig";
import { mockMineSaker } from "./mock-data.server";

export function loader() {
  return { saker: mockMineSaker };
}

export default function MineSakerSide() {
  const { saker } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Mine saker – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <Heading level="1" size="large" spacing className="mt-4">
          Mine saker
        </Heading>

        <SaksListe saker={saker} detaljSti={RouteConfig.SAKER_DETALJ.replace("/:sakId", "")} />
      </PageBlock>
    </Page>
  );
}
