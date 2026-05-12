import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { formaterStatus } from "~/saker/visning";
import type { Route } from "./+types/MineSakerSide.route";
import { MineSakerInnhold } from "./MineSakerInnhold";
import {
  ALLE_STATUSER,
  ALLE_VENTESTATUSER,
  DEFAULT_STATUSER,
  DEFAULT_VENTESTATUSER,
  filtrerMineSaker,
  formaterVentestatus,
  parseStatuser,
  parseVentestatuser,
} from "./filtre";

export async function loader({ request }: Route.LoaderArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  if (!skalBrukeMockdata) {
    throw new Response("Mine saker er ikke tilgjengelig uten mockdata", { status: 501 });
  }

  const url = new URL(request.url);
  const harFilterParams = url.searchParams.has("status") || url.searchParams.has("ventestatus");

  const statusFilter = harFilterParams
    ? parseStatuser(url.searchParams.getAll("status"))
    : DEFAULT_STATUSER;

  const ventestatusFilter = harFilterParams
    ? parseVentestatuser(url.searchParams.getAll("ventestatus"))
    : DEFAULT_VENTESTATUSER;

  const alleSaker = hentMineSaker(request, innloggetBruker.navIdent);
  const filtrerteSaker = filtrerMineSaker(alleSaker, statusFilter, ventestatusFilter);

  return {
    saker: filtrerteSaker,
    filterAlternativer: {
      status: ALLE_STATUSER.map((s) => ({ verdi: s, etikett: formaterStatus(s) })),
      ventestatus: ALLE_VENTESTATUSER.map((v) => ({ verdi: v, etikett: formaterVentestatus(v) })),
    },
    aktivtFilter: {
      status: statusFilter,
      ventestatus: ventestatusFilter,
    },
  };
}

export default function MineSakerSide() {
  const { saker, filterAlternativer, aktivtFilter } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Mine saker – Watson Sak</title>
      <PageBlock width="2xl" gutters className="mx-0!">
        <MineSakerInnhold
          saker={saker}
          detaljSti={RouteConfig.SAKER_DETALJ.replace("/:sakId", "")}
          filterAlternativer={filterAlternativer}
          aktivtFilter={aktivtFilter}
        />
      </PageBlock>
    </Page>
  );
}
