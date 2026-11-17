import { z } from "zod";
import { lagKontrollsakPageResponseSchema } from "~/saker/types.backend";

export { type KontrollsakPageResponse, type KontrollsakResponse } from "../saker/types.backend";

export function lagUfordelteSakerResponseSchema(
  visningsnavn?: Parameters<typeof lagKontrollsakPageResponseSchema>[0],
) {
  return lagKontrollsakPageResponseSchema(visningsnavn).extend({
    oppsummering: z.object({
      antallSaker: z.number().int().nonnegative(),
      eldsteLiggetidDager: z.number().int().nonnegative(),
    }),
    valgtOmfang: z.string(),
    enhetNavn: z.string(),
    organisasjonsvalg: z.array(
      z.object({ verdi: z.string(), label: z.string(), type: z.string() }),
    ),
  });
}

const ufordelteSakerResponseSchema = lagUfordelteSakerResponseSchema();

export type UfordelteSakerResponse = z.infer<typeof ufordelteSakerResponseSchema>;
