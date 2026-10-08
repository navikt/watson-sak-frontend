import type { KontrollsakResponse } from "~/saker/types.backend";

/*
 * Mockversjoner av tellingene backend gjør (Saksoversikt.kt i watson-admin-api).
 * Brukes bare i local-mock og demo. Backend er fasit.
 */

const AKTIVE_STEG = new Set(["UTREDNING", "UTREDES", "STRAFFERETTSLIG_VURDERING"]);
const VENTER_STEG = new Set(["FORVALTNING", "POLITI", "ANMELDT"]);

export function lagMockOyeblikksbilde(saker: KontrollsakResponse[]) {
  const åpne = saker.filter((sak) => sak.steg !== "AVSLUTTET");
  return {
    totalt: åpne.length,
    aktive: åpne.filter((sak) => sak.status === "AKTIV" && AKTIVE_STEG.has(sak.steg)).length,
    venterPåAndre: åpne.filter(
      (sak) =>
        VENTER_STEG.has(sak.steg) ||
        sak.status === "VENTER_PA_INFORMASJON" ||
        sak.status === "I_BERO",
    ).length,
    ikkeFordelt: åpne.filter((sak) => !sak.saksbehandlere.eier).length,
  };
}

type Kategori = "nye" | "aktive" | "venter" | "iBero";

function velgKategori(sak: KontrollsakResponse): Kategori | null {
  if (sak.steg === "AVSLUTTET") return null;
  if (sak.status === "I_BERO") return "iBero";
  if (sak.steg === "OPPRETTET") return "nye";
  if (VENTER_STEG.has(sak.steg)) return "venter";
  if (
    sak.status === "VENTER_PA_INFORMASJON" ||
    sak.status === "VENTER_PA_VEDTAK" ||
    sak.status === "VENTER_PA_RESULTAT" ||
    sak.status === "PAAKLAGET"
  ) {
    return "venter";
  }
  return "aktive";
}

export function lagMockMineSakerOppsummering(saker: KontrollsakResponse[]) {
  const antall: Record<Kategori, number> = { nye: 0, aktive: 0, venter: 0, iBero: 0 };
  for (const sak of saker) {
    const kategori = velgKategori(sak);
    if (kategori) antall[kategori] += 1;
  }
  return antall;
}
