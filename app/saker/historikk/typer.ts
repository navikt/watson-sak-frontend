import { z } from "zod";
import { visningsnavn, visningsnavnFraNavn } from "~/auth/visningsnavn";
import {
  kontrollsakHendelseResponseObjectSchema,
  normaliserHistoriskHendelseInput,
} from "~/saker/types.backend";

export const sakHendelseSchema = z
  .preprocess(
    normaliserHistoriskHendelseInput,
    kontrollsakHendelseResponseObjectSchema.extend({
      filnavn: z.string().nullable().optional(),
      berortSaksbehandlerNavIdent: z.string().optional(),
      berortSaksbehandlerEnhet: z.string().optional(),
      saksendringer: z
        .array(
          z.object({
            felt: z.string(),
            fra: z.string().nullable().optional(),
            til: z.string().nullable().optional(),
            lagtTil: z.array(z.string()).nullable().optional(),
            fjernet: z.array(z.string()).nullable().optional(),
          }),
        )
        .nullable()
        .optional(),
    }),
  )
  .transform((hendelse) => {
    const resultat = { ...hendelse };
    if (resultat.berortSaksbehandlerNavn != null) {
      resultat.berortSaksbehandlerNavn = visningsnavn(
        resultat.berortSaksbehandlerNavIdent,
        resultat.berortSaksbehandlerNavn,
      );
    }
    if (resultat.opprettetAvNavn) {
      resultat.opprettetAvNavn = visningsnavnFraNavn(resultat.opprettetAvNavn);
    }
    return resultat;
  });

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
