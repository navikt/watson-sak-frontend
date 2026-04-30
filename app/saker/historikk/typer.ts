import { z } from "zod";
import { kontrollsakHendelseResponseSchema } from "~/saker/types.backend";

export const sakHendelseSchema = kontrollsakHendelseResponseSchema.extend({
  tittel: z.string().optional(),
  notat: z.string().optional(),
  beskrivelse: z.string().nullable().optional(),
  berortSaksbehandlerNavn: z.string().optional(),
  berortSaksbehandlerNavIdent: z.string().optional(),
  berortSaksbehandlerEnhet: z.string().optional(),
});

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
