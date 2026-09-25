import type { LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { hentMockMigreringKandidater } from "./mock-data.server";
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

export async function loader({ request }: LoaderFunctionArgs): Promise<MigreringLister> {
  // Prototypen skal ikke servere eksempelsaker i miljøer med ekte backend.
  // En fremtidig integrasjon må autorisere og paginere i backend før uthenting.
  if (!skalBrukeMockdata) {
    throw new Response("Migreringsprototypen er bare tilgjengelig med mockdata", { status: 404 });
  }

  const bruker = await hentInnloggetBruker({ request });
  const kandidater = merkAlleredeOverforte(request, hentMockMigreringKandidater(bruker.navIdent));

  return {
    mine: kandidater.filter(
      (k) => k.ansvar.type === "BEKREFTET" && k.ansvar.navIdent === bruker.navIdent,
    ),
    // Dette er bare syntetiske eksempler. Ukjent ansvar skal ikke gi generell
    // innsynsrett i ekte data; den tilgangsregelen er ennå ikke avklart.
    utenBekreftetAnsvarlig: kandidater.filter((k) => k.ansvar.type !== "BEKREFTET"),
  };
}
