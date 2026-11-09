import type { CSSProperties } from "react";

export type Diagramfarge = {
  /** Aksel-token for fyllfargen. */
  fyll: string;
  /** Aksel-token for den tynne rammen rundt lyse farger. */
  kant?: string;
  /** Lyse farger skal ha mørk tekst, mørke farger hvit tekst. */
  lys: boolean;
};

/**
 * Fargeskalaen for statistikk, i prioritert rekkefølge (fra Figma, «Sak», node 12046:18817).
 * Diagrammer med få serier bruker de første fargene. Lyse farger har en tynn ramme.
 */
export const FARGESKALA: readonly Diagramfarge[] = [
  { fyll: "--ax-bg-brand-blue-strong", lys: false },
  { fyll: "--ax-text-brand-magenta-decoration", lys: false },
  { fyll: "--ax-text-accent-decoration", lys: false },
  {
    fyll: "--ax-bg-brand-blue-moderate",
    kant: "--ax-border-brand-blue",
    lys: true,
  },
  {
    fyll: "--ax-bg-brand-magenta-moderate",
    kant: "--ax-border-brand-magenta",
    lys: true,
  },
  { fyll: "--ax-text-brand-beige-subtle", lys: false },
  { fyll: "--ax-bg-warning-moderate", kant: "--ax-border-warning", lys: true },
  { fyll: "--ax-bg-warning-strong", lys: false },
  { fyll: "--ax-bg-meta-lime-soft", kant: "--ax-border-meta-lime", lys: true },
  {
    fyll: "--ax-bg-meta-purple-moderate",
    kant: "--ax-border-meta-purple",
    lys: true,
  },
];

/** Farge nummer `indeks` i skalaen. Går rundt hvis det er flere serier enn farger. */
export function fargeForIndeks(indeks: number): Diagramfarge {
  return FARGESKALA[indeks % FARGESKALA.length];
}

/** Bakgrunn og eventuell innvendig ramme for et fargefelt. */
export function fargestil(farge: Diagramfarge): CSSProperties {
  return {
    backgroundColor: `var(${farge.fyll})`,
    ...(farge.kant ? { boxShadow: `inset 0 0 0 1px var(${farge.kant})` } : {}),
  };
}

/** Bredde på skillestreken mellom segmenter i kakediagram. */
const SKILLE_GRADER = 1.5;
/** Bredde på rammen langs kantene til lyse segmenter i kakediagram. */
const KANT_GRADER = 0.6;
const SKILLEFARGE = "var(--ax-bg-default)";

/**
 * Lager en `conic-gradient` for et kake-/smultringdiagram med en hvit strek mellom
 * segmentene. Lyse segmenter får rammefargen langs de radielle kantene.
 * Segmenter uten verdi hoppes over.
 */
export function kakeGradient(segmenter: { farge: Diagramfarge; verdi: number }[]): string {
  const synlige = segmenter.filter((segment) => segment.verdi > 0);
  const total = synlige.reduce((sum, segment) => sum + segment.verdi, 0);
  if (total === 0) {
    return "conic-gradient(var(--ax-bg-neutral-moderate) 0deg 360deg)";
  }

  const skille = synlige.length > 1 ? SKILLE_GRADER : 0;
  let start = 0;
  const stopp = synlige.flatMap(({ farge, verdi }) => {
    const vinkel = (verdi / total) * 360;
    const slutt = start + vinkel;
    // Små segmenter får en smalere strek, slik at de aldri blir helt borte.
    const fargeSlutt = slutt - Math.min(skille, vinkel / 2);
    const fyll = `var(${farge.fyll})`;
    const deler: string[] = [];
    const kant = farge.kant ? Math.min(KANT_GRADER, (fargeSlutt - start) / 4) : 0;
    if (farge.kant && kant > 0) {
      const k = `var(${farge.kant})`;
      deler.push(
        `${k} ${start}deg ${start + kant}deg`,
        `${fyll} ${start + kant}deg ${fargeSlutt - kant}deg`,
        `${k} ${fargeSlutt - kant}deg ${fargeSlutt}deg`,
      );
    } else {
      deler.push(`${fyll} ${start}deg ${fargeSlutt}deg`);
    }
    if (skille > 0) {
      deler.push(`${SKILLEFARGE} ${fargeSlutt}deg ${slutt}deg`);
    }
    start = slutt;
    return deler;
  });

  return `conic-gradient(${stopp.join(", ")})`;
}
