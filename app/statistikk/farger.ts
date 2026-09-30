const FARGER = [
  "--ax-bg-accent-strong",
  "--ax-bg-neutral-strong",
  "--ax-bg-info-strong",
  "--ax-bg-success-strong",
  "--ax-bg-warning-strong",
  "--ax-bg-danger-strong",
  "--ax-bg-brand-blue-strong",
  "--ax-bg-brand-magenta-strong",
  "--ax-bg-brand-beige-strong",
  "--ax-bg-meta-purple-strong",
  "--ax-bg-meta-lime-strong",
] as const;

const FARGE_FOR_KODE: Record<string, (typeof FARGER)[number]> = {
  OPPRETTET: "--ax-bg-accent-strong",
  UTREDES: "--ax-bg-brand-blue-strong",
  FORVALTNING: "--ax-bg-meta-purple-strong",
  AVSLUTTET: "--ax-bg-success-strong",
  STRAFFE: "--ax-bg-danger-strong",
  STRAFFERETTSLIG_VURDERING: "--ax-bg-danger-strong",
  POLITI: "--ax-bg-info-strong",
  SAMLIV: "--ax-bg-brand-magenta-strong",
  ARBEID: "--ax-bg-brand-blue-strong",
  UTLAND: "--ax-bg-info-strong",
  IDENTITET: "--ax-bg-meta-purple-strong",
  TILTAK: "--ax-bg-success-strong",
  DOKUMENTFALSK: "--ax-bg-danger-strong",
  ANNET: "--ax-bg-neutral-strong",
  BEHANDLER: "--ax-bg-meta-lime-strong",
  "0-3": "--ax-bg-success-strong",
  "3-6": "--ax-bg-brand-blue-strong",
  "6-9": "--ax-bg-info-strong",
  "9-12": "--ax-bg-warning-strong",
  "12-24": "--ax-bg-danger-strong",
  ">24": "--ax-bg-brand-magenta-strong",
  "ETTER UTREDNING": "--ax-bg-meta-purple-strong",
  "SOM STRAFFESAK": "--ax-bg-danger-strong",
};

function normaliserKode(kode: string): string {
  return kode
    .replace(/[–—]/g, "-")
    .trim()
    .toUpperCase();
}

function indeksForKode(kode: string): number {
  return [...kode].reduce((sum, tegn) => sum + (tegn.codePointAt(0) ?? 0), 0) % FARGER.length;
}

/**
 * Kobler en domenekode (statuskode, aldersbøtte eller kategorikode) til en
 * Aksel-fargetoken. Dette er en presentasjonsbeslutning, og hører derfor
 * hjemme i frontend – backend skal bare levere stabile domenekoder.
 */
export function fargeForKode(kode: string): string {
  const normalisertKode = normaliserKode(kode);
  return FARGE_FOR_KODE[normalisertKode] ?? FARGER[indeksForKode(normalisertKode)];
}
