import { z } from "zod";
import { kontrollsakPageResponseSchema } from "~/saker/types.backend";

export { type KontrollsakPageResponse, type KontrollsakResponse } from "../saker/types.backend";

export const ufordelteSakerResponseSchema = kontrollsakPageResponseSchema.extend({
  oppsummering: z.object({
    antallSaker: z.number().int().nonnegative(),
    eldsteLiggetidDager: z.number().int().nonnegative(),
  }),
  valgtOmfang: z.string(),
  enhetNavn: z.string(),
  organisasjonsvalg: z.array(z.object({ verdi: z.string(), label: z.string(), type: z.string() })),
});

export type UfordelteSakerResponse = z.infer<typeof ufordelteSakerResponseSchema>;
