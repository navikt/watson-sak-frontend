import { z } from "zod";

/**
 * Skjult felt som `OppgaveSkjema` setter til «nei» når temaet ikke har gjelderverdier i Gosys.
 * Da skjules feltet, og oppgaven opprettes uten behandlingstema.
 */
export const gjelderverdiPåkrevdFelt = "gjelderverdiPåkrevd";

/** Feltene i `OppgaveSkjema`. Gjelderverdi sendes til backend som behandlingstema. */
export const oppgavefeltObjekt = z.object({
  oppgavetype: z.string({ error: "Velg oppgavetype" }).min(1, "Velg oppgavetype"),
  prioritet: z.string({ error: "Velg prioritet" }).min(1, "Velg prioritet"),
  frist: z.string({ error: "Velg frist" }).min(1, "Velg frist"),
  behandlendeEnhet: z.string({ error: "Velg behandlende enhet" }).min(1, "Velg behandlende enhet"),
  gjelderverdi: z.string().optional(),
  [gjelderverdiPåkrevdFelt]: z.string().optional(),
  beskrivelse: z.string({ error: "Skriv en beskrivelse" }).trim().min(1, "Skriv en beskrivelse"),
});

/** Gjelderverdi er påkrevd, med mindre temaet ikke har noen gjelderverdier å velge mellom. */
export function krevGjelderverdi(
  data: { gjelderverdi?: string; [gjelderverdiPåkrevdFelt]?: string },
  ctx: z.RefinementCtx,
) {
  if (data[gjelderverdiPåkrevdFelt] !== "nei" && !data.gjelderverdi) {
    ctx.addIssue({ code: "custom", path: ["gjelderverdi"], message: "Velg gjelderverdi" });
  }
}

export const oppgavefeltSkjema = oppgavefeltObjekt.superRefine(krevGjelderverdi);
