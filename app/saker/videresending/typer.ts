import { z } from "zod";

const mottakerSchema = z.enum(["nay", "nfp"]);

export type Mottaker = z.infer<typeof mottakerSchema>;

export const mottakerVisningsnavn: Record<Mottaker, string> = {
  nay: "NAY – Nasjonalt advarselsregister for ytelser",
  nfp: "NFP – Nav Forvaltning og Pensjon",
};

export const videresendingSkjemaSchema = z.object({
  mottaker: mottakerSchema,
  valgteFiler: z.array(z.string()).default([]),
  valgteJournalposter: z.array(z.string()).default([]),
  funn: z.string().min(1, "Du må beskrive funnene dine"),
  vurdering: z.string().min(1, "Du må skrive en vurdering"),
  anbefaling: z.string().min(1, "Du må skrive en anbefaling"),
});

export const videresendingSkjemaRefinert = videresendingSkjemaSchema.refine(
  (data) => data.valgteFiler.length > 0 || data.valgteJournalposter.length > 0,
  {
    message: "Du må velge minst ett dokument",
    path: ["dokumenter"],
  },
);
