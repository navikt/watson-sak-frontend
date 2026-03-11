import { z } from "zod";

export const sakKildeSchema = z.enum([
  "telefon",
  "epost",
  "brev",
  "registersamkjøring",
  "saksbehandler",
  "publikum",
  "politiet",
  "nay",
  "annet",
]);

export type SakKilde = z.infer<typeof sakKildeSchema>;

export const sakStatusSchema = z.enum([
  "tips mottatt",
  "tips avklart",
  "under utredning",
  "avsluttet",
  "henlagt",
]);

export type SakStatus = z.infer<typeof sakStatusSchema>;

const kontaktinformasjonSchema = z.object({
  navn: z.string().optional(),
  telefon: z.string().optional(),
  epost: z.string().email().optional().or(z.literal("")),
  anonymt: z.boolean().default(false),
});

export const sakSchema = z.object({
  id: z.string(),
  datoInnmeldt: z.string().date(),
  kilde: sakKildeSchema,
  notat: z.string(),
  fødselsnummer: z.string(),
  ytelser: z.array(z.string()),
  status: sakStatusSchema,
  seksjon: z.string(),
  fraDato: z.string().date().optional(),
  tilDato: z.string().date().optional(),
  avdeling: z.string().optional(),
  kategori: z.string().optional(),
  tags: z.array(z.string()).default([]),
  kontaktinformasjon: kontaktinformasjonSchema.optional(),
  beskrivelse: z.string().optional(),
});

export type Sak = z.infer<typeof sakSchema>;
