import type { KontrollsakSteg } from "./types.backend";

/** Alle gyldige kontrollsak-steg, i visningsrekkefølge. Delt mellom
 * alle-saker, fordeling og mine-saker slik at stegfilteret er likt overalt. */
export const ALLE_STEG: KontrollsakSteg[] = [
  "OPPRETTET",
  "UTREDES",
  "FORVALTNING",
  "STRAFFERETTSLIG_VURDERING",
  "POLITI",
  "AVSLUTTET",
];

export function parseSteg(verdier: string[]): KontrollsakSteg[] {
  return verdier.filter((v): v is KontrollsakSteg => ALLE_STEG.includes(v as KontrollsakSteg));
}
