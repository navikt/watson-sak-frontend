import { useLoaderData } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import { RouteConfig } from "~/routeConfig";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { formaterStatus } from "~/saker/visning";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Route } from "./+types/MineSakerSide.route";
import { MineSakerInnhold } from "./MineSakerInnhold";
import {
  ALLE_STATUSER,
  ALLE_VENTESTATUSER,
  DEFAULT_STATUSER,
  DEFAULT_VENTESTATUSER,
  formaterVentestatus,
  parseStatuser,
  parseVentestatuser,
} from "./filtre";

export async function loader({ request }: Route.LoaderArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  const url = new URL(request.url);
  const harFilterParams = url.searchParams.has("status") || url.searchParams.has("ventestatus");

  const statusFilter = harFilterParams
    ? parseStatuser(url.searchParams.getAll("status"))
    : DEFAULT_STATUSER;

  const ventestatusFilter = harFilterParams
    ? parseVentestatuser(url.searchParams.getAll("ventestatus"))
    : DEFAULT_VENTESTATUSER;

  let alleSaker: KontrollsakResponse[];
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const resultat = await hentKontrollsaker({
      token,
      page: 1,
      size: 200,
      ansvarligNavIdent: innloggetBruker.navIdent,
      status: statusFilter,
    });
    alleSaker = resultat.items;
  } else {
    alleSaker = hentMineSaker(request, innloggetBruker.navIdent, innloggetBruker.name);
  }

  // Ventestatus (blokkering) filtreres lokalt — backend mangler støtte for "utenBlokkering"
  const filtrerteSaker = alleSaker.filter((sak) => {
    if (ventestatusFilter.length === 0) return true;
    const sakVentestatus = sak.blokkert ?? "INGEN";
    return ventestatusFilter.includes(sakVentestatus);
  });

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
    <>
      <title>Mine saker – Watson Sak</title>
      <MineSakerInnhold
        saker={saker}
        detaljSti={RouteConfig.SAKER_DETALJ.replace("/:sakId", "")}
        filterAlternativer={filterAlternativer}
        aktivtFilter={aktivtFilter}
      />
    </>
  );
}
