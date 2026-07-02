import { z } from "zod";
import { kontrollsakHendelseResponseSchema } from "~/saker/types.backend";

const sakHendelseSchema = kontrollsakHendelseResponseSchema.extend({
  berortSaksbehandlerNavn: z.string().optional(),
  berortSaksbehandlerNavIdent: z.string().optional(),
  berortSaksbehandlerEnhet: z.string().optional(),
});

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
