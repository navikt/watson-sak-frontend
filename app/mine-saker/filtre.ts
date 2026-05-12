import type {
  Blokkeringsarsak,
  KontrollsakResponse,
  KontrollsakStatus,
} from "~/saker/types.backend";
import { formaterBlokkeringsarsak } from "~/saker/visning";

export const ALLE_STATUSER: KontrollsakStatus[] = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
];

export const ALLE_VENTESTATUSER: (Blokkeringsarsak | "INGEN")[] = [
  "INGEN",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "I_BERO",
];

export const DEFAULT_STATUSER: KontrollsakStatus[] = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
];

export const DEFAULT_VENTESTATUSER: (Blokkeringsarsak | "INGEN")[] = [
  "INGEN",
  "VENTER_PA_INFORMASJON",
];

export function formaterVentestatus(verdi: Blokkeringsarsak | "INGEN"): string {
  return verdi === "INGEN" ? "Ingen" : formaterBlokkeringsarsak(verdi);
}

export function filtrerMineSaker(
  saker: KontrollsakResponse[],
  statuser: KontrollsakStatus[],
  ventestatuser: (Blokkeringsarsak | "INGEN")[],
): KontrollsakResponse[] {
  return saker.filter((sak) => {
    if (statuser.length > 0 && !statuser.includes(sak.status)) return false;
    if (ventestatuser.length > 0) {
      const sakVentestatus: Blokkeringsarsak | "INGEN" = sak.blokkert ?? "INGEN";
      if (!ventestatuser.includes(sakVentestatus)) return false;
    }
    return true;
  });
}

export function parseStatuser(verdier: string[]): KontrollsakStatus[] {
  return verdier.filter((v): v is KontrollsakStatus =>
    ALLE_STATUSER.includes(v as KontrollsakStatus),
  );
}

export function parseVentestatuser(verdier: string[]): (Blokkeringsarsak | "INGEN")[] {
  return verdier.filter((v): v is Blokkeringsarsak | "INGEN" =>
    ALLE_VENTESTATUSER.includes(v as Blokkeringsarsak | "INGEN"),
  );
}
