import type { KontrollsakSteg } from "./types.backend";

/** Stegene som kan velges som filter, i visningsrekkefølge. Delt mellom
 * alle-saker, fordeling og mine-saker slik at stegfilteret er likt overalt. */
export const ALLE_STEG: KontrollsakSteg[] = [
  "OPPRETTET",
  "UTREDNING",
  "FORVALTNING",
  "STRAFFERETTSLIG_VURDERING",
  "POLITI",
];

export function parseSteg(verdier: string[]): KontrollsakSteg[] {
  const alleStøttedeSteg: KontrollsakSteg[] = [...ALLE_STEG, "AVSLUTTET"];
  const normaliserteVerdier = verdier.map((verdi) => (verdi === "UTREDES" ? "UTREDNING" : verdi));

  return [
    ...new Set(
      normaliserteVerdier.filter((verdi): verdi is KontrollsakSteg =>
        alleStøttedeSteg.includes(verdi as KontrollsakSteg),
      ),
    ),
  ];
}

export function matcherSteg(sakSteg: KontrollsakSteg, filterSteg: KontrollsakSteg[]): boolean {
  if (filterSteg.length === 0) return true;

  const normalisertSakSteg = sakSteg === "UTREDES" ? "UTREDNING" : sakSteg;
  return filterSteg.includes(normalisertSakSteg);
}
