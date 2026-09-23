import type { KontrollsakResponse, KontrollsakSteg } from "~/saker/types.backend";
import { hentStegbaserteSaksregler } from "../stegregler";

export type Sakshandling = "endre-status" | "gjenoppta" | "opprett-journalpost" | "opprett-oppgave";

export function erAktivSakKontrollsak(steg: KontrollsakSteg): boolean {
  return hentStegbaserteSaksregler(steg).erAktiv;
}

/** Sjekker om brukeren med gitt navIdent er sakens tildelte eier. */
export function erSakseier(sak: KontrollsakResponse, navIdent: string): boolean {
  return sak.saksbehandlere.eier?.navIdent === navIdent;
}

export function hentTilgjengeligeSakshandlinger(sak: KontrollsakResponse): Sakshandling[] {
  const regler = hentStegbaserteSaksregler(sak.steg);
  if (!regler.erAktiv) {
    return [];
  }

  if (sak.status !== null && sak.status !== "AKTIV") {
    return regler.kanUtføreUtredningsarbeid
      ? ["gjenoppta", "opprett-journalpost", "opprett-oppgave"]
      : ["gjenoppta"];
  }

  if (!regler.kanUtføreUtredningsarbeid) {
    return ["endre-status"];
  }

  return ["endre-status", "opprett-journalpost", "opprett-oppgave"];
}
