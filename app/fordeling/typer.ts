import { z } from "zod";

export const sakKildeSchema = z.enum([
  "telefon",
  "epost",
  "brev",
  "registersamkjøring",
  "saksbehandler",
  "annet",
]);

export type SakKilde = z.infer<typeof sakKildeSchema>;

export const sakStatusSchema = z.enum([
  "tips mottatt",
  "tips avklart",
  "under utredning",
  "avsluttet",
]);

export type SakStatus = z.infer<typeof sakStatusSchema>;

export const sakSchema = z.object({
  id: z.string(),
  datoInnmeldt: z.string().date(),
  kilde: sakKildeSchema,
  notat: z.string(),
  fødselsnummer: z.string(),
  ytelser: z.array(z.string()),
  status: sakStatusSchema,
  seksjon: z.string(),
});

export type Sak = z.infer<typeof sakSchema>;
