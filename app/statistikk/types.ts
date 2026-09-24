import { z } from "zod";

const antall = z.number().int().nonnegative();

export const statistikkResponseSchema = z.object({
  valgtOmfang: z.string().min(1),
  organisasjonsvalg: z.array(
    z.discriminatedUnion("type", [
      z.object({
        verdi: z.literal("meg"),
        label: z.string().min(1),
        type: z.literal("meg"),
      }),
      z.object({
        verdi: z.string().regex(/^enhet:[^:]+$/),
        label: z.string().min(1),
        type: z.literal("enhet"),
      }),
      z.object({
        verdi: z.literal("organisasjon"),
        label: z.string().min(1),
        type: z.literal("organisasjon"),
      }),
    ]),
  ),
  periode: z.object({ fra: z.string().date(), til: z.string().date(), label: z.string().min(1) }),
  varsler: z.array(
    z.object({
      tone: z.enum(["warning", "info"]),
      tekst: z.string().min(1),
      lenkeTekst: z.string().min(1),
      filter: z.string().min(1),
    }),
  ),
  nøkkeltall: z.array(
    z.object({
      label: z.string().min(1),
      verdi: z.string().min(1),
      forklaring: z.string().min(1),
      tone: z.enum(["accent", "warning", "danger", "success", "neutral"]),
    }),
  ),
  sakstyper: z.array(
    z.object({
      navn: z.string().min(1),
      filterverdi: z.string().min(1),
      deler: z.array(
        z.object({
          navn: z.string().min(1),
          filterverdi: z.string().min(1),
          verdi: antall,
          farge: z.string().min(1),
        }),
      ),
    }),
  ),
  alderssammensetning: z.array(
    z.object({ navn: z.string().min(1), verdi: antall, farge: z.string().min(1) }),
  ),
  periodeTall: z.object({
    innkomne: antall,
    avsluttede: antall,
    antattBeløp: z.string().min(1),
    vedtattBeløp: z.string().min(1),
    anmeldtBeløp: z.string().min(1),
  }),
  statusfordeling: z.array(
    z.object({
      navn: z.string().min(1),
      filterverdi: z.string().min(1),
      verdi: antall,
      prosent: z.number().min(0).max(100),
    }),
  ),
  kategorifordeling: z.array(
    z.object({ navn: z.string().min(1), verdi: antall, farge: z.string().min(1) }),
  ),
  kontrollrapport: z.array(
    z.object({ navn: z.string().min(1), verdi: antall, prosent: z.number().min(0).max(100) }),
  ),
  henlagt: z.array(z.object({ navn: z.string().min(1), verdi: antall, farge: z.string().min(1) })),
});

export type Statistikk = z.infer<typeof statistikkResponseSchema>;
export type StatistikkSpørring = {
  nivaa: "meg" | "underavdeling" | "hovedavdeling" | "nav-kontroll";
  fra: string;
  til: string;
  enhetId?: string;
};
