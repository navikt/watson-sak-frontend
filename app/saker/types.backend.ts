import { z } from "zod";
import { kontrollsakKategoriVerdier } from "./kategorier";

const kontrollsakStatusSchema = z.enum([
  "UFORDELT",
  "UTREDES",
  "FORVALTNING",
  "AVSLUTTET",
  "I_BERO",
]);

const kontrollsakKategoriSchema = z.enum(kontrollsakKategoriVerdier);

const kontrollsakPrioritetSchema = z.enum(["HOY", "NORMAL", "LAV"]);

const kontrollsakKildeSchema = z.enum(["INTERN", "EKSTERN", "ANONYM_TIPS"]);

const kontrollsakSaksbehandlerSchema = z.object({
  navIdent: z.string(),
  navn: z.string().nullable(),
});

const kontrollsakSaksbehandlereSchema = z.object({
  eier: kontrollsakSaksbehandlerSchema.nullable(),
  deltMed: z.array(kontrollsakSaksbehandlerSchema),
  opprettetAv: kontrollsakSaksbehandlerSchema,
});

export const kontrollsakYtelseSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  periodeFra: z.string(),
  periodeTil: z.string(),
  belop: z.number().nullable(),
});

const kontrollsakUtredningSchema = z.object({
  id: z.string().uuid(),
  opprettet: z.string(),
  resultat: z.string(),
});

const kontrollsakForvaltningSchema = z.object({
  id: z.string().uuid(),
  dato: z.string(),
  resultat: z.string(),
});

const kontrollsakStrafferettsligVurderingSchema = z.object({
  id: z.string().uuid(),
  dato: z.string(),
  resultat: z.string(),
});

const kontrollsakResultatSchema = z.object({
  utredning: kontrollsakUtredningSchema.nullable(),
  forvaltning: kontrollsakForvaltningSchema.nullable(),
  strafferettsligVurdering: kontrollsakStrafferettsligVurderingSchema.nullable(),
});

export const kontrollsakResponseSchema = z.object({
  id: z.string().uuid(),
  personIdent: z.string(),
  saksbehandlere: kontrollsakSaksbehandlereSchema,
  status: kontrollsakStatusSchema,
  kategori: kontrollsakKategoriSchema,
  kilde: kontrollsakKildeSchema,
  misbruktype: z.array(z.string()),
  prioritet: kontrollsakPrioritetSchema,
  ytelser: z.array(kontrollsakYtelseSchema),
  merking: z.string().nullable(),
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
});

export type KontrollsakYtelse = z.infer<typeof kontrollsakYtelseSchema>;
export type KontrollsakResponse = z.infer<typeof kontrollsakResponseSchema>;
export type KontrollsakPageResponse = z.infer<typeof kontrollsakPageResponseSchema>;
export type KontrollsakStatus = z.infer<typeof kontrollsakStatusSchema>;
export type KontrollsakKategori = z.infer<typeof kontrollsakKategoriSchema>;
export type KontrollsakKilde = z.infer<typeof kontrollsakKildeSchema>;
