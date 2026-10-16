import { z } from "zod";

/** Temaene Watson Sak kan arkivere journalposter og opprette oppgaver på. */
const TEMAER = ["KTR", "KTA"] as const;

export type Tema = (typeof TEMAER)[number];

export const STANDARD_TEMA: Tema = "KTR";

export const temaSkjema = z.enum(TEMAER, { error: "Velg tema" });

export function erTema(verdi: unknown): verdi is Tema {
  return temaSkjema.safeParse(verdi).success;
}

/** Viser temanavn med kode, f.eks. «Kontroll (KTR)». */
export function formaterTemavalg(
  tema: string,
  temaer: ReadonlyArray<{ kode: string; beskrivelse: string }>,
): string {
  const beskrivelse = temaer.find((valg) => valg.kode === tema)?.beskrivelse;
  return beskrivelse ? `${beskrivelse} (${tema})` : tema;
}
