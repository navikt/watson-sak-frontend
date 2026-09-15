import type { KontrollsakResponse, KontrollsakStatus } from "~/saker/types.backend";
import { hentStatusbaserteSaksregler } from "../statusregler";

export type Sakshandling = "endre-status" | "gjenoppta" | "opprett-journalpost" | "opprett-oppgave";

export function erAktivSakKontrollsak(status: KontrollsakStatus): boolean {
  return hentStatusbaserteSaksregler(status).erAktiv;
}

/** Sjekker om brukeren med gitt navIdent er sakens tildelte eier. */
export function erSakseier(sak: KontrollsakResponse, navIdent: string): boolean {
  return sak.saksbehandlere.eier?.navIdent === navIdent;
}

export function hentTilgjengeligeSakshandlinger(sak: KontrollsakResponse): Sakshandling[] {
  const regler = hentStatusbaserteSaksregler(sak.status);
  if (!regler.erAktiv) {
    return [];
  }

  if (sak.blokkert !== null) {
    return regler.kanUtføreUtredningsarbeid
      ? ["gjenoppta", "opprett-journalpost", "opprett-oppgave"]
      : ["gjenoppta"];
  }

  if (!regler.kanUtføreUtredningsarbeid) {
    return ["endre-status"];
  }

  return ["endre-status", "opprett-journalpost", "opprett-oppgave"];
}
