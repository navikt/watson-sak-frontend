import type { KontrollsakResponse } from "~/saker/types.backend";
import { erSakseier } from "./handlinger/tilgjengeligeHandlinger";

type Innlogget = { navIdent: string; erLesebruker?: boolean };

/*
 * Speiler `FilTilgangService` i watson-admin-api. Backend håndhever reglene,
 * frontend bruker dem bare til å vise og skjule handlinger. Endres de, må begge endres.
 *
 * - Ufordelt sak: alle med tilgang til personen kan se filområdet og laste opp,
 *   men ingen kan endre saken.
 * - Fordelt sak: bare eier og de saken er delt med kan se, laste opp og endre.
 * - Den som opprettet saken og ledere har ingen egen tilgang.
 *
 * Tilgang til personen og steg sjekkes ikke her, se `sak.tilgang` og `stegregler.ts`.
 */

/** Saken har ingen eier (ansvarlig saksbehandler). */
export function erUfordelt(sak: KontrollsakResponse): boolean {
  return !sak.saksbehandlere.eier;
}

/**
 * Eier eller delt med på en fordelt sak. Kreves for å endre saken og redigere dokumenter.
 * Delt med gir ikke tilgang på en ufordelt sak, selv om delingen står igjen etter fristilling.
 */
export function kanEndreSak(sak: KontrollsakResponse, innlogget: Innlogget): boolean {
  if (erUfordelt(sak)) return false;
  return (
    erSakseier(sak, innlogget.navIdent) ||
    sak.saksbehandlere.deltMed.some((s) => s.navIdent === innlogget.navIdent)
  );
}

/** Kan laste opp filer, omdøpe og flytte dem og lage mapper. Alle på en ufordelt sak. */
export function kanLasteOppFiler(sak: KontrollsakResponse, innlogget: Innlogget): boolean {
  return !innlogget.erLesebruker && (erUfordelt(sak) || kanEndreSak(sak, innlogget));
}

/**
 * Lesetilgang til arkiv, dokumenter og historikk. På avsluttet sak gir backend lesetilgang til alle
 * med tilgang til personen, men bare journalførte dokumenter. Unntaket er ansvarlig og delt med, som
 * ser alt i 30 dager etter avslutning (TH-101). Backend håndhever dette, så frontend slipper
 * avsluttede saker gjennom her.
 */
export function kanLeseSaksinnhold(sak: KontrollsakResponse, innlogget: Innlogget): boolean {
  return kanEndreSak(sak, innlogget) || sak.steg === "AVSLUTTET";
}

/** Kan se filområdet (filer og mapper). På en ufordelt sak gjelder det alle. */
export function kanSeFilområdet(sak: KontrollsakResponse, innlogget: Innlogget): boolean {
  return erUfordelt(sak) || kanLeseSaksinnhold(sak, innlogget);
}
