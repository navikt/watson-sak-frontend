import { createCookie } from "react-router";
import { env } from "~/config/env.server";
import type { Migreringskilde } from "~/migrering/types";

/**
 * `fnr` er valgfritt fordi migreringskandidater aldri eksponerer
 * personIdent til klienten (bevisst utelatt i backend-responsen av
 * personvernhensyn). "Opprett sak" fra migreringslisten kan derfor bare
 * forhåndsutfylle `legacyPid`/`legacyKilde` — saksbehandler må fortsatt slå
 * opp personen manuelt med fødselsnummer på /registrer-sak.
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
