import type { LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentMockMigreringKandidater } from "./mock-data.server";
import type { MigreringLister } from "./types";

export async function loader({ request }: LoaderFunctionArgs): Promise<MigreringLister> {
  // Prototypen skal ikke servere eksempelsaker i miljøer med ekte backend.
  // En fremtidig integrasjon må autorisere og paginere i backend før uthenting.
  if (!skalBrukeMockdata) {
    throw new Response("Migreringsprototypen er bare tilgjengelig med mockdata", { status: 404 });
  }

  const bruker = await hentInnloggetBruker({ request });
  const kandidater = hentMockMigreringKandidater(bruker.navIdent);

  return {
    mine: kandidater.filter(
      (k) => k.ansvar.type === "BEKREFTET" && k.ansvar.navIdent === bruker.navIdent,
    ),
    // Dette er bare syntetiske eksempler. Ukjent ansvar skal ikke gi generell
    // innsynsrett i ekte data; den tilgangsregelen er ennå ikke avklart.
    utenBekreftetAnsvarlig: kandidater.filter((k) => k.ansvar.type !== "BEKREFTET"),
  };
}
