import type { LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, skalBrukeMockdata } from "~/config/env.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { hentMockMigreringKandidater } from "./mock-data.server";
import { hentMigreringsliste, type Migreringsliste, type Migreringsvisning } from "./api.server";
import { logger } from "~/logging/logging";
import type { MigreringKandidat, MigreringLister } from "./types";

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

/** Utløpt sesjon (401) skal bevares. Alle andre feil gir tom liste og en kort feilmelding. */
function erUtlogget(feil: unknown): boolean {
  if (typeof feil !== "object" || feil === null) return false;
  const status =
    (feil as { status?: number }).status ?? (feil as { init?: { status?: number } }).init?.status;
  return status === 401;
}

async function hentListe(request: Request, visning: Migreringsvisning): Promise<Migreringsliste> {
  try {
    return await hentMigreringsliste(request, visning);
  } catch (feil) {
    if (erUtlogget(feil)) throw feil;
    logger.error("Kunne ikke hente migreringsliste, viser tom liste", { visning });
    return { kandidater: [], utilgjengelig: true };
  }
}

export async function loader({ request }: LoaderFunctionArgs): Promise<MigreringLister> {
  // Produksjonsmiljøene er stengt til import/oppbevaring og tilgang er godkjent.
  // Lokal backend kaller eksisterende beskyttet migrerings-API med brukertoken.
  if (!skalBrukeMockdata) {
    if (env.ENVIRONMENT !== "local-backend") {
      throw new Response("Migreringslisten er ikke tilgjengelig", { status: 404 });
    }
    const bruker = await hentInnloggetBruker({ request });
    const mine = await hentListe(request, "MINE");
    const ansatte = bruker.erLeder
      ? await hentListe(request, "ANSATTE")
      : { kandidater: [], utilgjengelig: false };
    return {
      mine: mine.kandidater,
      ansatte: ansatte.kandidater,
      utilgjengelig: mine.utilgjengelig || ansatte.utilgjengelig,
    };
  }

  const bruker = await hentInnloggetBruker({ request });
  const kandidater = merkAlleredeOverforte(request, hentMockMigreringKandidater(bruker.navIdent));

  return {
    mine: kandidater.filter(
      (k) => k.ansvar.type === "BEKREFTET" && k.ansvar.navIdent === bruker.navIdent,
    ),
    // Syntetiske eksempler har ingen andre ansvarlige. Ledervisningen er bare i ekte backend.
    ansatte: [],
    utilgjengelig: false,
  };
}
