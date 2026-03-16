import { z } from "zod";

export const sakHendelseTypeSchema = z.enum([
  "opprettet",
  "status_endret",
  "tildelt",
  "seksjon_endret",
  "avdeling_endret",
  "henlagt",
  "videresendt_nay_nfp",
]);

export type SakHendelseType = z.infer<typeof sakHendelseTypeSchema>;

export const sakHendelseSchema = z.object({
  id: z.string(),
  sakId: z.string(),
  tidspunkt: z.string().datetime(),
  type: sakHendelseTypeSchema,
  utførtAv: z.string(),
  detaljer: z
    .object({
      fra: z.string().optional(),
      til: z.string().optional(),
      notat: z.string().optional(),
    })
    .optional(),
});

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
