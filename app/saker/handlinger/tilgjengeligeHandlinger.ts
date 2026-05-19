import type { KontrollsakResponse, KontrollsakStatus } from "~/saker/types.backend";

export type Sakshandling =
  | "endre-status"
  | "sett-pa-vent"
  | "gjenoppta"
  | "opprett-journalpost"
  | "opprett-oppgave";

export function erAktivSakKontrollsak(status: KontrollsakStatus): boolean {
  return status !== "AVSLUTTET";
}

export function hentTilgjengeligeSakshandlinger(sak: KontrollsakResponse): Sakshandling[] {
  if (!erAktivSakKontrollsak(sak.status)) {
    return [];
  }

  if (sak.blokkert !== null) {
    return ["gjenoppta", "opprett-journalpost", "opprett-oppgave"];
  }

  return ["endre-status", "sett-pa-vent", "opprett-journalpost", "opprett-oppgave"];
}
