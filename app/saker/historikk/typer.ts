import { z } from "zod";
import { visningsnavn } from "~/auth/visningsnavn";
import {
  kontrollsakHendelseResponseObjectSchema,
  normaliserHistoriskHendelseInput,
} from "~/saker/types.backend";

export const sakHendelseSchema = z
  .preprocess(
    normaliserHistoriskHendelseInput,
    kontrollsakHendelseResponseObjectSchema.extend({
      berortSaksbehandlerNavn: z.string().optional(),
      berortSaksbehandlerNavIdent: z.string().optional(),
      berortSaksbehandlerEnhet: z.string().optional(),
    }),
  )
  .transform((hendelse) =>
    hendelse.berortSaksbehandlerNavn === undefined
      ? hendelse
      : {
          ...hendelse,
          berortSaksbehandlerNavn: visningsnavn(
            hendelse.berortSaksbehandlerNavIdent,
            hendelse.berortSaksbehandlerNavn,
          ),
        },
  );

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
