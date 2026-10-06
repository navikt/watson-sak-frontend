import type { LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { erUtloggetFeil } from "~/auth/session-utløpt.server";
import { env, skalBrukeMockdata } from "~/config/env.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { hentMockMigreringKandidater } from "./mock-data.server";
import { hentMigreringsliste, type Migreringsvisning } from "./api.server";
import { logger } from "~/logging/logging";
import { migreringErÅpen } from "./miljo";
import {
  MIGRERING_SIDESTORRELSE,
  type MigreringKandidat,
  type MigreringLister,
  type MigreringSide,
} from "./types";

/**
 * Kobler kandidatene mot faktisk opprettede mock-saker: en kandidat er
 * «overført til Watson» når det finnes en sak i mock-lageret med samme
 * (legacyKilde, legacyPid) — uansett om det skjedde i denne økten (via
 * migreringslisten sitt «Opprett sak») eller var forhåndsdefinert i
 * mock-dataene.
 */
function merkAlleredeOverforte(
  request: Request,
  kandidater: MigreringKandidat[],
): MigreringKandidat[] {
  const saker = hentAlleSaker(request);

  return kandidater.map((k) => {
    const treff = saker.find(
      (sak) => sak.legacyKilde === k.legacyKilde && sak.legacyPid === k.legacyPid,
    );
    if (!treff) {
      return k;
    }
    return { ...k, alleredeMigrertTilKontrollsakId: treff.id };
  });
}

const TOM_SIDE: MigreringSide = { kandidater: [], side: 1, totalSider: 0, totalAntall: 0 };

/** Sidenummer fra URL-en. Ugyldige verdier gir side 1. */
function lesSide(url: URL, navn: string): number {
  const verdi = url.searchParams.get(navn) ?? "";
  if (!/^\d+$/.test(verdi)) return 1;
  const side = Number(verdi);
  return Number.isSafeInteger(side) && side >= 1 ? side : 1;
}

/** Henter én side. Hvis siden er forbi siste side (for eksempel etter at saker er flyttet), vises siste side. */
async function hentListe(
  request: Request,
  visning: Migreringsvisning,
  side: number,
): Promise<{ side: MigreringSide; utilgjengelig: boolean }> {
  try {
    let liste = await hentMigreringsliste(request, visning, side);
    if (liste.totalSider > 0 && side > liste.totalSider) {
      liste = await hentMigreringsliste(request, visning, liste.totalSider);
    }
    return {
      side: {
        kandidater: liste.kandidater,
        side: liste.side,
        totalSider: liste.totalSider,
        totalAntall: liste.totalAntall,
      },
      utilgjengelig: liste.utilgjengelig,
    };
  } catch (feil) {
    // Utløpt sesjon (401) skal bevares. Alle andre feil gir tom liste og en kort feilmelding.
    if (erUtloggetFeil(feil)) throw feil;
    logger.error("Kunne ikke hente migreringsliste, viser tom liste", { visning });
    return { side: TOM_SIDE, utilgjengelig: true };
  }
}

/** Deler en liste i sider (for mock-data, der backend ikke paginerer). */
function sideAv(kandidater: MigreringKandidat[], side: number): MigreringSide {
  const totalSider = Math.ceil(kandidater.length / MIGRERING_SIDESTORRELSE);
  const aktiv = Math.min(side, Math.max(1, totalSider));
  const fra = (aktiv - 1) * MIGRERING_SIDESTORRELSE;
  return {
    kandidater: kandidater.slice(fra, fra + MIGRERING_SIDESTORRELSE),
    side: aktiv,
    totalSider,
    totalAntall: kandidater.length,
  };
}

export async function loader({ request }: LoaderFunctionArgs): Promise<MigreringLister> {
  const url = new URL(request.url);
  const side = lesSide(url, "side");
  const ansatteSide = lesSide(url, "ansatteSide");

  // `prod` er stengt til importen er godkjent. `local-backend` og `dev` kaller det beskyttede
  // migrerings-API-et med brukertoken. `local-mock` og `demo` bruker syntetiske eksempler (se under).
  if (!skalBrukeMockdata) {
    if (!migreringErÅpen(env.ENVIRONMENT)) {
      throw new Response("Migreringslisten er ikke tilgjengelig", { status: 404 });
    }
    const bruker = await hentInnloggetBruker({ request });
    // Uavhengige, potensielt trege kall: hent parallelt så svartiden ikke blir summen.
    const [mine, ansatte] = await Promise.all([
      hentListe(request, "MINE", side),
      bruker.erLeder
        ? hentListe(request, "ANSATTE", ansatteSide)
        : Promise.resolve({ side: TOM_SIDE, utilgjengelig: false }),
    ]);
    return {
      mine: mine.side,
      ansatte: ansatte.side,
      utilgjengelig: mine.utilgjengelig || ansatte.utilgjengelig,
    };
  }

  const bruker = await hentInnloggetBruker({ request });
  const kandidater = merkAlleredeOverforte(request, hentMockMigreringKandidater(bruker.navIdent));

  return {
    mine: sideAv(
      kandidater.filter(
        (k) => k.ansvar.type === "BEKREFTET" && k.ansvar.navIdent === bruker.navIdent,
      ),
      side,
    ),
    // Syntetiske eksempler har ingen andre ansvarlige. Ledervisningen er bare i ekte backend.
    ansatte: TOM_SIDE,
    utilgjengelig: false,
  };
}
