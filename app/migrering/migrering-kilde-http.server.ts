import { data } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { erUtloggetFeil } from "~/auth/session-utløpt.server";
import { env } from "~/config/env.server";
import { logger } from "~/logging/logging";
import {
  hentMigreringsAnsatte,
  hentMigreringsliste,
  tildelMigreringskandidat,
  type Migreringsfilter,
  type Migreringsvisning,
} from "./api.server";
import type { MigreringKilde } from "./migrering-kilde.server";
import { migreringErÅpen } from "./miljo";
import { MIGRERING_SIDESTORRELSE, type MigreringAnsatt, type MigreringSide } from "./types";

const TOM_SIDE: MigreringSide = { kandidater: [], side: 1, totalSider: 0, totalAntall: 0 };

/** Henter én side. Hvis siden er forbi siste side (for eksempel etter at saker er flyttet), vises siste side. */
async function hentListe(
  request: Request,
  visning: Migreringsvisning,
  side: number,
  filter: Migreringsfilter,
): Promise<{ side: MigreringSide; utilgjengelig: boolean }> {
  try {
    let liste = await hentMigreringsliste(request, visning, side, MIGRERING_SIDESTORRELSE, filter);
    if (liste.totalSider > 0 && side > liste.totalSider) {
      liste = await hentMigreringsliste(
        request,
        visning,
        liste.totalSider,
        MIGRERING_SIDESTORRELSE,
        filter,
      );
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

async function hentAnsatteValg(request: Request): Promise<MigreringAnsatt[] | null> {
  try {
    return await hentMigreringsAnsatte(request);
  } catch (feil) {
    if (erUtloggetFeil(feil)) throw feil;
    logger.error("Kunne ikke hente ansatte til filter og tildeling");
    return null;
  }
}

/** Åpne miljøer kaller det beskyttede migrerings-API-et. */
export function httpMigreringKilde(request: Request): MigreringKilde {
  return {
    async hentLister({ side, filter }) {
      if (!migreringErÅpen(env.ENVIRONMENT)) {
        throw new Response("Migreringslisten er ikke tilgjengelig", { status: 404 });
      }
      const bruker = await hentInnloggetBruker({ request });
      const backendFilter: Migreringsfilter = filter;
      // Uavhengige, potensielt trege kall: hent parallelt så svartiden ikke blir summen.
      const [liste, ansatteValg] = await Promise.all([
        bruker.erLeder
          ? hentListe(request, "ALLE", side, backendFilter)
          : hentListe(request, "MINE", side, { status: filter.status }),
        bruker.erLeder ? hentAnsatteValg(request) : Promise.resolve([]),
      ]);
      return {
        liste: liste.side,
        ansatteValg: ansatteValg ?? [],
        filter,
        erLeder: bruker.erLeder,
        egenNavIdent: bruker.navIdent,
        utilgjengelig: liste.utilgjengelig || ansatteValg === null,
      };
    },

    async tildel({ kandidatId, navIdent }) {
      if (!migreringErÅpen(env.ENVIRONMENT)) {
        throw data("Endring av tildeling er ikke tilgjengelig", { status: 404 });
      }
      try {
        await tildelMigreringskandidat(request, kandidatId, navIdent);
        return { ok: true };
      } catch (feil) {
        if (erUtloggetFeil(feil)) throw feil;
        if (feil instanceof Response && feil.status === 409) {
          return {
            ok: false,
            feil: "Saken er allerede påbegynt og kan ikke flyttes til en annen.",
          };
        }
        if (feil instanceof Response && (feil.status === 404 || feil.status === 403)) {
          return {
            ok: false,
            feil: "Du kan ikke tildele denne saken til den valgte saksbehandleren.",
          };
        }
        throw feil;
      }
    },
  };
}
