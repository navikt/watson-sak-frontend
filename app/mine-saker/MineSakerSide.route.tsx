import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import type { Route } from "./+types/MineSakerSide.route";
import { MineSakerInnhold } from "./MineSakerInnhold";

export async function loader({ request }: Route.LoaderArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  if (!skalBrukeMockdata) {
    // TODO: Implementer backend-kall for mine saker
    throw new Response("Mine saker er ikke tilgjengelig uten mockdata", { status: 501 });
  }

  return {
    saker: hentMineSaker(innloggetBruker.navIdent),
  };
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
