import { useLoaderData } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { hentAlleSaker, hentMineSaker } from "~/saker/mock-alle-saker.server";
import { normaliserTilMockIdent } from "~/testing/mock-store/alle-saker.server";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { SORTERBARE_SAKSKOLONNER, standardRetningForKolonne } from "~/saker/saksliste/oppsett";
import { sorterSaker } from "~/alle-saker/saker-utils";
import { formaterSteg } from "~/saker/visning";
import { hentParEllerUtilgjengelig } from "~/utils/backend-utilgjengelig.server";
import type { KontrollsakResponse, KontrollsakStatus } from "~/saker/types.backend";
import { ANTALL_PER_SIDE, paginerElementer } from "~/utils/paginering";
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

type Sorteringsretning = "asc" | "desc";
type Sorteringskolonne = "saksid" | "kategori" | "steg" | "status" | "opprettet" | "oppdatert";

const BACKEND_SORT_FELT: Record<Sorteringskolonne, string> = {
  saksid: "id",
  kategori: "kategori",
  steg: "steg",
  status: "status",
  opprettet: "opprettet",
  oppdatert: "oppdatert",
};

function lagSorteringParam(kolonne: Sorteringskolonne, retning: Sorteringsretning): string {
  return `${BACKEND_SORT_FELT[kolonne]},${retning.toUpperCase()}`;
}

/** Tabellen med saker er bred, så siden ber layouten om å slippe maks-bredden
 * for å unngå unødvendig horisontal scroll på brede skjermer. */
export const handle = { bredPageBlock: true };

export async function loader({ request }: Route.LoaderArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  const url = new URL(request.url);
  const aktivFane: "mine" | "delt" = url.searchParams.get("fane") === "delt" ? "delt" : "mine";
  const side = Math.max(1, Number.parseInt(url.searchParams.get("side") ?? "1", 10) || 1);
  const sorteringskolonne = parseKolonne(url.searchParams.get("sorter"));
  const sorteringsretning = parseRetning(url.searchParams.get("retning"));
  const harFilterParams = url.searchParams.has("steg") || url.searchParams.has("status");

  // Uten filter i URL-en skjuler vi avsluttede saker (TH-122).
  const stegFilter = harFilterParams ? parseSteg(url.searchParams.getAll("steg")) : [...ALLE_STEG];

  const statusFilter = harFilterParams ? parseVentestatuser(url.searchParams.getAll("status")) : [];

  // Map status-filteret til backend-parametre:
  // "INGEN" → utenStatus=true, faktiske blokkerende statuser → status[]
  const blokkerendeStatus = statusFilter.filter((v): v is KontrollsakStatus => v !== "INGEN");
  const harIngenStatus = statusFilter.length > 0 && statusFilter.includes("INGEN");

  const filterParametre = {
    steg: stegFilter.length > 0 ? stegFilter : undefined,
    status: blokkerendeStatus.length > 0 ? blokkerendeStatus : undefined,
    utenStatus: harIngenStatus ? true : undefined,
  };
  const fellesParametre = {
    page: side,
    size: ANTALL_PER_SIDE,
    ...filterParametre,
    sortering: lagSorteringParam(sorteringskolonne, sorteringsretning),
  };

  let saker: KontrollsakResponse[] = [];
  let deltMedSaker: KontrollsakResponse[] = [];
  let rader = [] as ReturnType<typeof mapKontrollsakTilSakslisteRad>[];
  let antallMineSaker = 0;
  let antallDelteSaker = 0;
  let aktivSide = side;
  let totalAntall = 0;
  let totalSider = 0;
  let saksdataUtilgjengelig = false;
  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const mineParametre = { ansvarlig: "MEG" as const, ...fellesParametre };
    const delteParametre = {
      tilknyttet: "MEG" as const,
      utelatEgneSaker: true,
      ...fellesParametre,
    };
    const aktivtParametre = aktivFane === "mine" ? mineParametre : delteParametre;
    const inaktivTelleParametre =
      aktivFane === "mine"
        ? { ...delteParametre, page: 1, size: 1, sortering: undefined }
        : { ...mineParametre, page: 1, size: 1, sortering: undefined };
    const resultat = await hentParEllerUtilgjengelig(
      hentKontrollsaker({ token, ...aktivtParametre }),
      hentKontrollsaker({ token, ...inaktivTelleParametre }),
    );
    if (resultat.saksdataUtilgjengelig) {
      saksdataUtilgjengelig = true;
    } else {
      const [aktivtResultat, telleResultat] = resultat.resultater;
      const mineResultat = aktivFane === "mine" ? aktivtResultat : telleResultat;
      const delteResultat = aktivFane === "delt" ? aktivtResultat : telleResultat;
      saker = aktivFane === "mine" ? aktivtResultat.items : [];
      deltMedSaker = aktivFane === "delt" ? aktivtResultat.items : [];
      rader = aktivtResultat.items.map((sak) => mapKontrollsakTilSakslisteRad(sak));
      antallMineSaker = mineResultat.totalItems;
      antallDelteSaker = delteResultat.totalItems;
      aktivSide = aktivtResultat.page;
      totalAntall = aktivtResultat.totalItems;
      totalSider = aktivtResultat.totalPages;
    }
  } else {
    const alleSaker = hentAlleSaker(request);
    const egneSaker = hentMineSaker(request, innloggetBruker.navIdent, innloggetBruker.name);
    const innloggetIdentiteter = new Set([
      innloggetBruker.navIdent,
      normaliserTilMockIdent(innloggetBruker.navIdent),
    ]);
    const erInnloggetBruker = (navIdent?: string) =>
      navIdent !== undefined && innloggetIdentiteter.has(navIdent);
    const delteSaker = alleSaker.filter((sak) => {
      const eier = sak.saksbehandlere.eier?.navIdent;
      const erTilknyttet =
        erInnloggetBruker(eier) ||
        sak.saksbehandlere.deltMed.some((saksbehandler) =>
          erInnloggetBruker(saksbehandler.navIdent),
        );
      return erTilknyttet && !erInnloggetBruker(eier);
    });
    const mineTreff = sorterSaker(
      filtrerMineSaker(egneSaker, stegFilter, statusFilter),
      sorteringskolonne,
      sorteringsretning,
    );
    const delteTreff = sorterSaker(
      filtrerMineSaker(delteSaker, stegFilter, statusFilter),
      sorteringskolonne,
      sorteringsretning,
    );
    antallMineSaker = mineTreff.length;
    antallDelteSaker = delteTreff.length;
    const aktiveTreff = aktivFane === "mine" ? mineTreff : delteTreff;
    const paginert = paginerElementer(aktiveTreff, side, ANTALL_PER_SIDE);
    saker = aktivFane === "mine" ? paginert.elementer : [];
    deltMedSaker = aktivFane === "delt" ? paginert.elementer : [];
    rader = paginert.elementer.map((sak) => mapKontrollsakTilSakslisteRad(sak));
    aktivSide = paginert.aktivSide;
    totalAntall = aktiveTreff.length;
    totalSider = aktiveTreff.length === 0 ? 0 : paginert.totalSider;
  }

  return {
    saker,
    deltMedSaker,
    rader,
    aktivFane,
    aktivSide,
    totalAntall,
    totalSider,
    antallMineSaker,
    antallDelteSaker,
    sorteringskolonne,
    sorteringsretning,
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

function parseKolonne(verdi: string | null): Sorteringskolonne {
  return SORTERBARE_SAKSKOLONNER.includes(verdi as Sorteringskolonne)
    ? (verdi as Sorteringskolonne)
    : "opprettet";
}

function parseRetning(verdi: string | null): Sorteringsretning {
  return verdi === "asc" || verdi === "desc"
    ? verdi
    : standardRetningForKolonne(parseKolonne(null));
}

export default function MineSakerSide() {
  const {
    rader,
    aktivFane,
    aktivSide,
    totalAntall,
    totalSider,
    antallMineSaker,
    antallDelteSaker,
    sorteringskolonne,
    sorteringsretning,
    filterAlternativer,
    aktivtFilter,
    saksdataUtilgjengelig,
  } = useLoaderData<typeof loader>();

  return (
    <>
      <MiljøtilpassetTittel>Mine saker – Watson Sak</MiljøtilpassetTittel>
      <MineSakerInnhold
        rader={rader}
        aktivFane={aktivFane}
        aktivSide={aktivSide}
        totalAntall={totalAntall}
        totalSider={totalSider}
        antallMineSaker={antallMineSaker}
        antallDelteSaker={antallDelteSaker}
        sorteringskolonne={sorteringskolonne}
        sorteringsretning={sorteringsretning}
        saksdataUtilgjengelig={saksdataUtilgjengelig}
        filterAlternativer={filterAlternativer}
        aktivtFilter={aktivtFilter}
      />
    </>
  );
}
