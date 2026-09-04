import type { Kodeverk } from "~/saker/api.server";

/**
 * Oversetter en enhetskode (f.eks. "hu424t") til enhetsnavnet ("Nord").
 * Ukjente koder vises som de er, slik at UI-et aldri blir tomt.
 */
export function finnEnhetsnavn(enheter: Kodeverk["enheter"], kode: string): string {
  return enheter.find((enhet) => enhet.kode === kode)?.beskrivelse ?? kode;
}
