import { useLoaderData } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { hentMineSaker } from "~/saker/mock-alle-saker.server";
import { formaterSteg } from "~/saker/visning";
import { hentParEllerUtilgjengelig } from "~/utils/backend-utilgjengelig.server";
import type { KontrollsakResponse, KontrollsakStatus } from "~/saker/types.backend";
import type { Route } from "./+types/MineSakerSide.route";
import { MineSakerInnhold } from "./MineSakerInnhold";
import {
  ALLE_STEG,
  ALLE_VENTESTATUSER,
  filtrerMineSaker,
  formaterVentestatus,
  parseSteg,
  parseVentestatuser,
} from "./filtre";

/** Tabellen med saker er bred, så siden ber layouten om å slippe maks-bredden
 * for å unngå unødvendig horisontal scroll på brede skjermer. */
export const handle = { bredPageBlock: true };

export async function loader({ request }: Route.LoaderArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  const url = new URL(request.url);
  const harFilterParams = url.searchParams.has("steg") || url.searchParams.has("status");

  // Uten filter i URL-en skjuler vi avsluttede saker (TH-122).
  const stegFilter = harFilterParams ? parseSteg(url.searchParams.getAll("steg")) : [...ALLE_STEG];

  const statusFilter = harFilterParams ? parseVentestatuser(url.searchParams.getAll("status")) : [];

  // Map status-filteret til backend-parametre:
  // "INGEN" → utenStatus=true, faktiske blokkerende statuser → status[]
  const blokkerendeStatus = statusFilter.filter((v): v is KontrollsakStatus => v !== "INGEN");
  const harIngenStatus = statusFilter.length > 0 && statusFilter.includes("INGEN");

  let saker: KontrollsakResponse[];
  let deltMedSaker: KontrollsakResponse[];
  let saksdataUtilgjengelig = false;
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const felles = {
      token,
      page: 1,
      // Sorteringen og sidedelingen skjer i klienten, så vi henter alle saker på én gang.
      // TODO: Flytt sidedeling og sortering til backend (se RAILS-2-1). size=200 er en midlertidig øvre grense.
      size: 200,
    };
    // Filtrene gjelder bare Mine saker. Delt med meg henter alltid alle delte saker.
    const mineFiltre = {
      steg: stegFilter.length > 0 ? stegFilter : undefined,
      status: blokkerendeStatus.length > 0 ? blokkerendeStatus : undefined,
      utenStatus: harIngenStatus ? true : undefined,
    };
    const resultat = await hentParEllerUtilgjengelig(
      hentKontrollsaker({ ...felles, ...mineFiltre, ansvarlig: "MEG" }),
      hentKontrollsaker({ ...felles, tilknyttet: "MEG" }),
    );
    if (resultat.saksdataUtilgjengelig) {
      saker = [];
      deltMedSaker = [];
      saksdataUtilgjengelig = true;
    } else {
      const [mineSakerResultat, tilknyttedeSakerResultat] = resultat.resultater;
      saker = mineSakerResultat.items;
      deltMedSaker = tilknyttedeSakerResultat.items.filter(
        (sak) => sak.saksbehandlere?.eier?.navIdent !== innloggetBruker.navIdent,
      );
    }
  } else {
    const alleSaker = hentMineSaker(request, innloggetBruker.navIdent, innloggetBruker.name);
    saker = filtrerMineSaker(alleSaker, stegFilter, statusFilter);
    deltMedSaker = [];
  }

  return {
    saker,
    deltMedSaker,
    saksdataUtilgjengelig,
    filterAlternativer: {
      steg: [...ALLE_STEG, "AVSLUTTET" as const].map((s) => ({
        verdi: s,
        etikett: formaterSteg(s),
      })),
      status: ALLE_VENTESTATUSER.map((v) => ({ verdi: v, etikett: formaterVentestatus(v) })),
    },
    aktivtFilter: {
      steg: stegFilter,
      status: statusFilter,
    },
  };
}

export default function MineSakerSide() {
  const { saker, deltMedSaker, filterAlternativer, aktivtFilter, saksdataUtilgjengelig } =
    useLoaderData<typeof loader>();

  return (
    <>
      <MiljøtilpassetTittel>Mine saker – Watson Sak</MiljøtilpassetTittel>
      <MineSakerInnhold
        saker={saker}
        deltMedSaker={deltMedSaker}
        saksdataUtilgjengelig={saksdataUtilgjengelig}
        detaljSti={RouteConfig.SAKER_DETALJ.replace("/:sakId", "")}
        filterAlternativer={filterAlternativer}
        aktivtFilter={aktivtFilter}
      />
    </>
  );
}
