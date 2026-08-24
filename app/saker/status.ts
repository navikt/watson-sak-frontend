import type { KontrollsakStatus } from "./types.backend";

/** Alle gyldige kontrollsak-statuser, i visningsrekkefølge. Delt mellom
 * alle-saker, fordeling og mine-saker slik at statusfilteret er likt overalt. */
export const ALLE_STATUSER: KontrollsakStatus[] = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
];

export function parseStatuser(verdier: string[]): KontrollsakStatus[] {
  return verdier.filter((v): v is KontrollsakStatus =>
    ALLE_STATUSER.includes(v as KontrollsakStatus),
  );
}
