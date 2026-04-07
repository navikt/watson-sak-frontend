import { z } from "zod";

const kontrollsakStatusSchema = z.enum([
  "OPPRETTET",
  "AVKLART",
  "UTREDES",
  "TIL_FORVALTNING",
  "HENLAGT",
  "AVSLUTTET",
]);

const kontrollsakKategoriSchema = z.enum(["UDEFINERT", "FEILUTBETALING", "MISBRUK", "OPPFØLGING"]);

const kontrollsakPrioritetSchema = z.enum(["HØY", "NORMAL", "LAV"]);

const kontrollsakKildeSchema = z.enum(["INTERN", "EKSTERN", "ANONYM_TIPS"]);

const kontrollsakAvsenderSchema = z.object({
  id: z.string(),
  navn: z.string().nullable(),
  telefon: z.string().nullable(),
  adresse: z.string().nullable(),
  anonym: z.boolean(),
});

const kontrollsakVedleggSchema = z.object({
  id: z.string().uuid(),
  filnavn: z.string(),
  lokasjon: z.string(),
});

const kontrollsakBakgrunnSchema = z.object({
  id: z.string().uuid(),
  kilde: kontrollsakKildeSchema,
  innhold: z.string(),
  avsender: kontrollsakAvsenderSchema.nullable(),
  vedlegg: z.array(kontrollsakVedleggSchema),
  tilleggsopplysninger: z.string().nullable(),
});

export const kontrollsakYtelseSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  periodeFra: z.string(),
  periodeTil: z.string(),
});

const kontrollsakAvklaringSchema = z.object({
  id: z.string().uuid(),
  saksbehandler: z.string(),
  dato: z.string(),
  resultat: z.string(),
  begrunnelse: z.string().nullable(),
});

const kontrollsakUtredningSchema = z.object({
  id: z.string().uuid(),
  dato: z.string(),
  resultat: z.string(),
});

const kontrollsakForvaltningSchema = z.object({
  id: z.string().uuid(),
  dato: z.string(),
  resultat: z.string(),
});

const kontrollsakResultatSchema = z.object({
  avklaring: kontrollsakAvklaringSchema.nullable(),
  utredning: kontrollsakUtredningSchema.nullable(),
  forvaltning: kontrollsakForvaltningSchema.nullable(),
});

export const kontrollsakResponseSchema = z.object({
  id: z.string().uuid(),
  personIdent: z.string(),
  saksbehandler: z.string(),
  status: kontrollsakStatusSchema,
  kategori: kontrollsakKategoriSchema,
  prioritet: kontrollsakPrioritetSchema,
  mottakEnhet: z.string(),
  mottakSaksbehandler: z.string(),
  ytelser: z.array(kontrollsakYtelseSchema),
  bakgrunn: kontrollsakBakgrunnSchema.nullable(),
  resultat: kontrollsakResultatSchema.nullable(),
  opprettet: z.string(),
  oppdatert: z.string().nullable(),
});

export const kontrollsakPageResponseSchema = z.object({
  items: z.array(kontrollsakResponseSchema),
  page: z.number(),
  size: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

export const kontrollsakHendelseResponseSchema = z.object({
  hendelseId: z.string().uuid(),
  tidspunkt: z.string(),
  hendelsesType: z.string(),
  sakId: z.string().uuid(),
  kategori: kontrollsakKategoriSchema,
  prioritet: kontrollsakPrioritetSchema,
  status: kontrollsakStatusSchema,
  ytelseTyper: z.array(z.string()),
  kilde: kontrollsakKildeSchema.nullable(),
  avklaringResultat: z.string().nullable(),
  mottakEnhet: z.string(),
});

export type KontrollsakYtelse = z.infer<typeof kontrollsakYtelseSchema>;
export type KontrollsakResponse = z.infer<typeof kontrollsakResponseSchema>;
export type KontrollsakPageResponse = z.infer<typeof kontrollsakPageResponseSchema>;
