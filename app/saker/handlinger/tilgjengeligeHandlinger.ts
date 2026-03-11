import type { SakStatus } from "~/saker/typer";

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
  return status !== "avsluttet" && status !== "henlagt";
}
