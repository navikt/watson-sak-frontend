import { z } from "zod";
import {
  kontrollsakKategoriVerdier,
  kontrollsakKildeVerdier,
  kontrollsakMisbrukstypeVerdier,
} from "./kategorier";

const kontrollsakStatusSchema = z.enum([
  "UFORDELT",
  "TILDELT",
  "UTREDES",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "ANMELDELSE_VURDERES",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
  "I_BERO",
]);

const kontrollsakHandlingSchema = z.enum([
  "TILDEL",
  "FRISTILL",
  "START_UTREDNING",
  "SETT_VENTER_PA_INFORMASJON",
  "SETT_VENTER_PA_VEDTAK",
  "SETT_ANMELDELSE_VURDERES",
  "SETT_ANMELDT",
  "SETT_HENLAGT",
  "SETT_I_BERO",
  "FORTSETT_FRA_I_BERO",
  "AVSLUTT",
  "AVSLUTT_MED_KONKLUSJON",
]);

const støttetKontrollsakHandlingSchema = z.union([kontrollsakHandlingSchema, z.string()]);

const avslutningskonklusjonSchema = z.enum(["POLITIET_HENLA", "FRIFUNNET", "DOMFELT"]);

const pakrevdFeltSchema = z.object({
  felt: z.string(),
  tillatteVerdier: z.array(z.string()),
});

const tilgjengeligHandlingSchema = z.object({
  handling: støttetKontrollsakHandlingSchema,
  pakrevdeFelter: z.array(pakrevdFeltSchema),
  resultatStatus: kontrollsakStatusSchema,
});

const kontrollsakKategoriSchema = z.enum(kontrollsakKategoriVerdier);
const kontrollsakKildeSchema = z.enum(kontrollsakKildeVerdier);
const kontrollsakMisbrukstypeSchema = z.enum(kontrollsakMisbrukstypeVerdier);
const kontrollsakPrioritetSchema = z.enum(["LAV", "NORMAL", "HOY"]);

const saksbehandlerSchema = z.object({
  navIdent: z.string(),
  navn: z.string(),
  enhet: z.string().nullable(),
});

const saksbehandlereSchema = z
  .object({
    eier: saksbehandlerSchema.nullable().optional(),
    ansvarlig: saksbehandlerSchema.nullable().optional(),
    deltMed: z.array(saksbehandlerSchema),
    opprettetAv: saksbehandlerSchema,
  })
  .transform(({ eier, ansvarlig, ...rest }) => ({
    ...rest,
    eier: eier ?? ansvarlig ?? null,
  }));

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

export const kontrollsakSaksbehandlerSchema = z.object({
  navIdent: z.string(),
  navn: z.string(),
  enhet: z.string().nullable(),
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

export const kontrollsakResponseSchema = z
  .object({
    id: z.string().uuid(),
    personIdent: z.string(),
    personNavn: z.string().nullable().optional(),
    saksbehandlere: saksbehandlereSchema,
    status: kontrollsakStatusSchema,
    avslutningskonklusjon: avslutningskonklusjonSchema.nullable(),
    tilgjengeligeHandlinger: z.array(tilgjengeligHandlingSchema),
    kategori: kontrollsakKategoriSchema,
    kilde: kontrollsakKildeSchema,
    misbruktype: z.array(kontrollsakMisbrukstypeSchema),
    prioritet: kontrollsakPrioritetSchema,
    ytelser: z.array(kontrollsakYtelseSchema),
    merking: z.string().nullable(),
    resultat: kontrollsakResultatSchema.nullable(),
    opprettet: z.string(),
    oppdatert: z.string().nullable(),
  })
  .transform((sak) => ({
    ...sak,
    personNavn: sak.personNavn ?? null,
  }));

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
  berortSaksbehandlerNavn: z.string().optional(),
  berortSaksbehandlerNavIdent: z.string().optional(),
  berortSaksbehandlerEnhet: z.string().optional(),
});

export type KontrollsakYtelse = z.infer<typeof kontrollsakYtelseSchema>;
export type KontrollsakSaksbehandler = z.infer<typeof kontrollsakSaksbehandlerSchema>;
export type KontrollsakResponse = z.infer<typeof kontrollsakResponseSchema>;
export type KontrollsakPageResponse = z.infer<typeof kontrollsakPageResponseSchema>;
export type KontrollsakStatus = z.infer<typeof kontrollsakStatusSchema>;
export type KontrollsakHandling = z.infer<typeof kontrollsakHandlingSchema>;
export type Avslutningskonklusjon = z.infer<typeof avslutningskonklusjonSchema>;
export type TilgjengeligHandling = z.infer<typeof tilgjengeligHandlingSchema>;
export type KontrollsakKategori = z.infer<typeof kontrollsakKategoriSchema>;
export type KontrollsakKilde = z.infer<typeof kontrollsakKildeSchema>;
export type KontrollsakMisbrukstype = z.infer<typeof kontrollsakMisbrukstypeSchema>;
