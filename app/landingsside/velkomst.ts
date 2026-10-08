import type { KontrollsakResponse } from "~/saker/types.backend";

type Bøtte = "AKTIV" | "NY" | "VENTER" | "I_BERO";

interface Oppsummeringsdel {
  antall: number;
  tekst: string;
}

function formaterSakTekst(antall: number, entall: string, flertall: string) {
  return `${antall} ${antall === 1 ? entall : flertall}`;
}

/**
 * Plasserer en sak i nøyaktig én bøtte, eller ingen (avsluttede saker).
 * Reglene sjekkes i rekkefølge, og første treff vinner.
 */
export function velgBøtte(sak: KontrollsakResponse): Bøtte | null {
  if (sak.steg === "AVSLUTTET") return null;
  if (sak.status === "I_BERO") return "I_BERO";
  if (sak.steg === "OPPRETTET") return "NY";

  if (sak.steg === "FORVALTNING" || sak.steg === "POLITI" || sak.steg === "ANMELDT") {
    return "VENTER";
  }

  if (
    sak.status === "VENTER_PA_INFORMASJON" ||
    sak.status === "VENTER_PA_VEDTAK" ||
    sak.status === "VENTER_PA_RESULTAT" ||
    sak.status === "PAAKLAGET"
  ) {
    return "VENTER";
  }

  // UTREDNING, UTREDES (eldre data) og STRAFFERETTSLIG_VURDERING med status null eller AKTIV.
  return "AKTIV";
}

const bøttetekster: Record<Bøtte, [entall: string, flertall: string]> = {
  AKTIV: ["aktiv sak", "aktive saker"],
  NY: ["ny sak", "nye saker"],
  VENTER: ["sak på vent", "saker på vent"],
  I_BERO: ["sak i bero", "saker i bero"],
};

function velgMestRelevantArbeid(saker: KontrollsakResponse[]): Oppsummeringsdel[] {
  const antall: Record<Bøtte, number> = { AKTIV: 0, NY: 0, VENTER: 0, I_BERO: 0 };

  for (const sak of saker) {
    const bøtte = velgBøtte(sak);
    if (bøtte) antall[bøtte] += 1;
  }

  return (Object.keys(bøttetekster) as Bøtte[])
    .map((bøtte) => ({
      antall: antall[bøtte],
      tekst: formaterSakTekst(antall[bøtte], ...bøttetekster[bøtte]),
    }))
    .filter((del) => del.antall > 0)
    .sort((a, b) => b.antall - a.antall)
    .slice(0, 2);
}

function sammenstillOppsummering(oppsummeringer: Oppsummeringsdel[]) {
  if (oppsummeringer.length === 0) {
    return "Er du klar for nye oppgaver? Du har ingen saker hos deg akkurat nå.";
  }

  if (oppsummeringer.length === 1) {
    return `Akkurat nå har du ${oppsummeringer[0].tekst}.`;
  }

  return `Akkurat nå har du ${oppsummeringer[0].tekst} og ${oppsummeringer[1].tekst}.`;
}

export function lagVelkomstOppsummering(saker: KontrollsakResponse[]) {
  return sammenstillOppsummering(velgMestRelevantArbeid(saker));
}
