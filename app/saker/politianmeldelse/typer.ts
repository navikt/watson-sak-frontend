import { z } from "zod";

export const politianmeldelseSkjemaSchema = z.object({
  valgteFiler: z.array(z.string()).default([]),
  valgteJournalposter: z.array(z.string()).default([]),
  funn: z.string().min(1, "Du må beskrive funnene dine"),
  vurdering: z.string().min(1, "Du må skrive en vurdering"),
  anbefaling: z.string().min(1, "Du må skrive en anbefaling"),
});

export const politianmeldelseSkjemaRefinert = politianmeldelseSkjemaSchema.refine(
  (data) => data.valgteFiler.length > 0 || data.valgteJournalposter.length > 0,
  {
    message: "Du må velge minst ett dokument",
    path: ["dokumenter"],
  },
);
