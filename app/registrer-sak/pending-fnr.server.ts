import { createCookie } from "react-router";
import { env } from "~/config/env.server";
import type { Migreringskilde } from "~/migrering/types";

/**
 * `fnr` er valgfritt. For en kandidat med bekreftet ansvar kan backend
 * returnere `personIdent` til den ansvarlige, og da forhåndsutfylles `fnr`
 * sammen med `legacyPid`/`legacyKilde`. Mangler `personIdent` (for eksempel
 * rader uten fødselsnummer), må saksbehandler slå opp personen manuelt på
 * /registrer-sak. Backend kontrollerer uansett at `personIdent` stemmer med
 * kandidaten når saken opprettes.
 */
export interface PendingSakData {
  fnr?: string;
  legacyPid?: string;
  legacyKilde?: Migreringskilde;
}

export const pendingFnrCookie = createCookie("pending-fnr", {
  path: "/registrer-sak",
  maxAge: 60, // engangskode, utløper etter 1 minutt
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  secrets: [env.IDENT_SESSION_SECRET],
});
