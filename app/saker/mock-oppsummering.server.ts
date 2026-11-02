import type { KontrollsakResponse } from "~/saker/types.backend";

/*
 * Mockversjoner av tellingene backend gjør (SakKategori i Saksoversikt.kt i watson-admin-api).
 * Brukes bare i local-mock og demo. Backend er fasit, og reglene her må holdes like.
 */

const VENTER_STEG = new Set(["FORVALTNING", "POLITI", "ANMELDT"]);
const VENTER_STATUSER = new Set([
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "VENTER_PA_RESULTAT",
  "I_BERO",
]);

export type SakKategori = "nye" | "aktive" | "venter";

/**
 * Den felles kategoriregelen. Første regel som passer, avgjør:
 * avsluttet telles ikke, så venter (steg eller status, i bero inkludert), så ny (opprettet), ellers aktiv.
 */
export function velgSakKategori(
  sak: Pick<KontrollsakResponse, "steg" | "status">,
): SakKategori | null {
  if (sak.steg === "AVSLUTTET") return null;
  if (VENTER_STEG.has(sak.steg) || (sak.status !== null && VENTER_STATUSER.has(sak.status))) {
    return "venter";
  }
  if (sak.steg === "OPPRETTET") return "nye";
  return "aktive";
}

function tellKategorier(saker: KontrollsakResponse[]) {
  const antall: Record<SakKategori, number> = { nye: 0, aktive: 0, venter: 0 };
  for (const sak of saker) {
    const kategori = velgSakKategori(sak);
    if (kategori) antall[kategori] += 1;
  }
  return antall;
}

/** Nøkkeltallene for åpne saker. Nye, aktive og venter summerer til totalt. Ikke fordelt går på tvers. */
export function lagMockOyeblikksbilde(saker: KontrollsakResponse[]) {
  const åpne = saker.filter((sak) => velgSakKategori(sak) !== null);
  const { nye, aktive, venter } = tellKategorier(åpne);
  return {
    totalt: åpne.length,
    nye,
    aktive,
    venterPåAndre: venter,
    ikkeFordelt: åpne.filter((sak) => !sak.saksbehandlere.eier).length,
  };
}

export function lagMockMineSakerOppsummering(saker: KontrollsakResponse[]) {
  return tellKategorier(saker);
}
