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
        filnavn: z.string().nullable().optional(),
        dokumentnavn: z.string().nullable().optional(),
        antallArkiverteDokumenter: z.number().int().nullable().optional(),
        journalpostTittel: z.string().nullable().optional(),
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
