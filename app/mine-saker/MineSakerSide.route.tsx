import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { MineSakerInnhold } from "./MineSakerInnhold";
import { mockMineKontrollsaker } from "./mock-data.server";

export function loader() {
  return { saker: mockMineKontrollsaker.filter((sak) => sak.status !== "UFORDELT") };
}

export default function MineSakerSide() {
  const { saker } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Mine saker – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <MineSakerInnhold
          saker={saker}
          detaljSti={RouteConfig.SAKER_DETALJ.replace("/:sakId", "")}
        />
      </PageBlock>
    </Page>
  );
}
