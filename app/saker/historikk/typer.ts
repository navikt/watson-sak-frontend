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
      berortSaksbehandlerNavn: z.string().optional(),
      berortSaksbehandlerNavIdent: z.string().optional(),
      berortSaksbehandlerEnhet: z.string().optional(),
    }),
  )
  .transform((hendelse) => {
    const resultat = { ...hendelse };
    if (resultat.berortSaksbehandlerNavn !== undefined) {
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
