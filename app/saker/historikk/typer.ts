import { z } from "zod";
import {
  kontrollsakHendelseResponseObjectSchema,
  normaliserHistoriskHendelseInput,
} from "~/saker/types.backend";

export const sakHendelseSchema = z.preprocess(
  normaliserHistoriskHendelseInput,
  kontrollsakHendelseResponseObjectSchema.extend({
    berortSaksbehandlerNavn: z.string().optional(),
    berortSaksbehandlerNavIdent: z.string().optional(),
    berortSaksbehandlerEnhet: z.string().optional(),
  }),
);

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
