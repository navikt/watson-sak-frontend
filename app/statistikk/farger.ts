/**
 * Aksel sine «-strong»-farger ligger på samme lyshet (ca. 4,5:1 mot bakgrunnen),
 * så to nabosegmenter har nesten ingen kontrast mot hverandre. Vi skiller dem
 * derfor med en strek i bakgrunnsfargen (se `kakeGradient` og stablede søyler),
 * og velger farger med ulik fargetone for koder som ligger ved siden av hverandre.
 *
 * `--ax-bg-info-strong` er utelatt fordi den har nøyaktig samme verdi som
 * `--ax-bg-brand-blue-strong` i både lyst og mørkt tema.
 */
const FARGER = [
  "--ax-bg-accent-strong",
  "--ax-bg-neutral-strong",
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
  // Steg
  OPPRETTET: "--ax-bg-accent-strong",
  TILDELT: "--ax-bg-accent-strong",
  UTREDES: "--ax-bg-warning-strong",
  UTREDNING: "--ax-bg-warning-strong",
  FORVALTNING: "--ax-bg-meta-purple-strong",
  AVSLUTTET: "--ax-bg-success-strong",
  HENLAGT: "--ax-bg-neutral-strong",
  STRAFFE: "--ax-bg-danger-strong",
  STRAFFERETTSLIG_VURDERING: "--ax-bg-danger-strong",
  POLITI: "--ax-bg-brand-beige-strong",
  // Kategorier
  SAMLIV: "--ax-bg-brand-magenta-strong",
  ARBEID: "--ax-bg-brand-blue-strong",
  UTLAND: "--ax-bg-success-strong",
  IDENTITET: "--ax-bg-meta-purple-strong",
  TILTAK: "--ax-bg-accent-strong",
  DOKUMENTFALSK: "--ax-bg-danger-strong",
  ANNET: "--ax-bg-neutral-strong",
  BEHANDLER: "--ax-bg-meta-lime-strong",
  // Henleggelsesgrunner
  "ETTER UTREDNING": "--ax-bg-meta-purple-strong",
  "SOM STRAFFESAK": "--ax-bg-danger-strong",
};

/** Bredde på skillestreken mellom segmenter i kakediagram. */
const SKILLE_GRADER = 1.5;
const SKILLEFARGE = "var(--ax-bg-default)";

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
 * Kobler en domenekode (statuskode eller kategorikode) til en Aksel-fargetoken.
 * Dette er en presentasjonsbeslutning, og hører derfor hjemme i frontend –
 * backend skal bare levere stabile domenekoder.
 */
export function fargeForKode(kode: string): string {
  const normalisertKode = normaliserKode(kode);
  return FARGE_FOR_KODE[normalisertKode] ?? FARGER[indeksForKode(normalisertKode)];
}

/**
 * Lager en `conic-gradient` for et kake-/smultringdiagram med en tynn strek i
 * bakgrunnsfargen mellom segmentene, slik at grensene oppfyller kravet om 3:1
 * kontrast selv når nabofargene har lik lyshet. Segmenter uten verdi hoppes over.
 */
export function kakeGradient(segmenter: { farge: string; verdi: number }[]): string {
  const synlige = segmenter.filter((segment) => segment.verdi > 0);
  const total = synlige.reduce((sum, segment) => sum + segment.verdi, 0);
  if (total === 0) {
    return "conic-gradient(var(--ax-bg-neutral-moderate) 0deg 360deg)";
  }

  const skille = synlige.length > 1 ? SKILLE_GRADER : 0;
  let start = 0;
  const stopp = synlige.flatMap((segment) => {
    const slutt = start + (segment.verdi / total) * 360;
    const fargeSlutt = Math.max(start, slutt - skille);
    const deler = [`var(${segment.farge}) ${start}deg ${fargeSlutt}deg`];
    if (skille > 0) {
      deler.push(`${SKILLEFARGE} ${fargeSlutt}deg ${slutt}deg`);
    }
    start = slutt;
    return deler;
  });

  return `conic-gradient(${stopp.join(", ")})`;
}
