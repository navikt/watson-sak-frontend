import { z } from "zod";
import {
  kontrollsakHendelseResponseObjectSchema,
  normaliserHistoriskHendelseInput,
} from "~/saker/types.backend";

type Visningsnavn = (navIdent: string | null | undefined, navn: string) => string;
type VisningsnavnFraNavn = (navn: string) => string | null | undefined;

export function lagSakHendelseSchema(
  visningsnavn?: Visningsnavn,
  visningsnavnFraNavn?: VisningsnavnFraNavn,
) {
  return z
    .preprocess(
      normaliserHistoriskHendelseInput,
      kontrollsakHendelseResponseObjectSchema.extend({
        berortSaksbehandlerNavIdent: z.string().optional(),
        berortSaksbehandlerEnhet: z.string().optional(),
      }),
    )
    .transform((hendelse) => {
      const resultat = { ...hendelse };
      if (visningsnavn && resultat.berortSaksbehandlerNavn != null) {
        resultat.berortSaksbehandlerNavn = visningsnavn(
          resultat.berortSaksbehandlerNavIdent,
          resultat.berortSaksbehandlerNavn,
        );
      }
      if (visningsnavnFraNavn && resultat.opprettetAvNavn) {
        resultat.opprettetAvNavn = visningsnavnFraNavn(resultat.opprettetAvNavn);
      }
      return resultat;
    });
}

const sakHendelseSchema = lagSakHendelseSchema();

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
