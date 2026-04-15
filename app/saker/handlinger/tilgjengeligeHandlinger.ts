import type { SakStatus } from "~/saker/typer";
import type { KontrollsakStatus } from "~/saker/visning";

const statusRekkefølge: SakStatus[] = [
  "tips mottatt",
  "tips avklart",
  "under utredning",
  "avsluttet",
];

/** Hent neste status i rekkefølgen, eller null om saken er i sluttilstand */
export function hentNesteStatus(status: SakStatus): SakStatus | null {
  const index = statusRekkefølge.indexOf(status);
  if (index === -1 || index >= statusRekkefølge.length - 1) return null;
  return statusRekkefølge[index + 1];
}

/** Sjekk om en sak kan ha handlinger utført på seg */
export function erAktivSak(status: SakStatus): boolean {
  return (
    status !== "avsluttet" &&
    status !== "henlagt" &&
    status !== "videresendt til nay/nfp" &&
    status !== "politianmeldt"
  );
}

/** Sjekk om en sak kan videresendes til NAY/NFP */
export function kanVideresendesTilNayNfp(status: SakStatus): boolean {
  return status === "under utredning";
}

/** Sjekk om en sak kan politianmeldes */
export function kanPolitianmeldes(status: SakStatus): boolean {
  return status === "under utredning";
}

export function erAktivSakKontrollsak(status: KontrollsakStatus): boolean {
  return (
    status === "UFORDELT" || status === "UTREDES" || status === "FORVALTNING" || status === "I_BERO"
  );
}

export function hentNesteStatusKontrollsak(status: KontrollsakStatus): KontrollsakStatus | null {
  switch (status) {
    case "UFORDELT":
      return "UTREDES";
    default:
      return null;
  }
}
