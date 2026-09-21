import type {
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakSteg,
} from "~/saker/types.backend";
import { formaterStatus } from "~/saker/visning";
import { ALLE_STEG, parseSteg } from "~/saker/steg";

export { ALLE_STEG, parseSteg };

export const ALLE_VENTESTATUSER: (KontrollsakStatus | "INGEN")[] = [
  "INGEN",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "I_BERO",
];

export function formaterVentestatus(verdi: KontrollsakStatus | "INGEN"): string {
  return verdi === "INGEN" ? "Aktiv" : formaterStatus(verdi);
}

export function filtrerMineSaker(
  saker: KontrollsakResponse[],
  steg: KontrollsakSteg[],
  ventestatuser: (KontrollsakStatus | "INGEN")[],
): KontrollsakResponse[] {
  return saker.filter((sak) => {
    if (steg.length > 0 && !steg.includes(sak.steg)) return false;
    if (ventestatuser.length > 0) {
      const sakVentestatus: KontrollsakStatus | "INGEN" = sak.status ?? "INGEN";
      if (!ventestatuser.includes(sakVentestatus)) return false;
    }
    return true;
  });
}

export function parseVentestatuser(verdier: string[]): (KontrollsakStatus | "INGEN")[] {
  return verdier.filter((v): v is KontrollsakStatus | "INGEN" =>
    ALLE_VENTESTATUSER.includes(v as KontrollsakStatus | "INGEN"),
  );
}
