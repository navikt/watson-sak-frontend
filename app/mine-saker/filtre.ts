import type {
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakSteg,
} from "~/saker/types.backend";
import { formaterStatus } from "~/saker/visning";
import { ALLE_STEG, matcherSteg, parseSteg } from "~/saker/steg";

export { ALLE_STEG, parseSteg };

export const ALLE_VENTESTATUSER: KontrollsakStatus[] = [
  "AKTIV",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "VENTER_PA_RESULTAT",
  "PAAKLAGET",
  "I_BERO",
];

export function formaterVentestatus(verdi: KontrollsakStatus): string {
  return formaterStatus(verdi);
}

export function filtrerMineSaker(
  saker: KontrollsakResponse[],
  steg: KontrollsakSteg[],
  ventestatuser: KontrollsakStatus[],
): KontrollsakResponse[] {
  return saker.filter((sak) => {
    if (!matcherSteg(sak.steg, steg)) return false;
    if (ventestatuser.length > 0) {
      if (sak.status === null || !ventestatuser.includes(sak.status)) return false;
    }
    return true;
  });
}

export function parseVentestatuser(verdier: string[]): KontrollsakStatus[] {
  return verdier
    .map((verdi) => (verdi === "INGEN" ? "AKTIV" : verdi))
    .filter((verdi): verdi is KontrollsakStatus =>
      ALLE_VENTESTATUSER.includes(verdi as KontrollsakStatus),
    );
}
