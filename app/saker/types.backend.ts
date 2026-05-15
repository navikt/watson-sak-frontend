import { z } from "zod";
import {
  kontrollsakKategoriVerdier,
  kontrollsakKildeVerdier,
  kontrollsakMisbrukstypeVerdier,
} from "./kategorier";

const kontrollsakStatusSchema = z.enum([
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
]);

export const blokkeringsarsakSchema = z.enum([
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "I_BERO",
]);

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

const kontrollsakYtelseSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  periodeFra: z.string(),
  periodeTil: z.string(),
  belop: z.number().nullable(),
});

const kontrollsakSaksbehandlerSchema = z.object({
  navIdent: z.string(),
  navn: z.string(),
  enhet: z.string().nullable(),
});

const oppgaveKortSchema = z.object({
  oppgaveId: z.number(),
  status: z.string(),
  tema: z.string().nullable(),
  oppgavetype: z.string().nullable(),
  tildeltEnhetsnr: z.string().nullable(),
  tilordnetRessurs: z.string().nullable(),
  aktivDato: z.string().nullable(),
  fristDato: z.string().nullable(),
  sistEndret: z.string().nullable(),
  opprettet: z.string(),
});

export const kontrollsakResponseSchema = z
  .object({
    id: z.number(),
    personIdent: z.string(),
    personNavn: z.string().nullable().optional(),
    saksbehandlere: saksbehandlereSchema,
    status: kontrollsakStatusSchema,
    blokkert: blokkeringsarsakSchema.nullable(),
    kategori: kontrollsakKategoriSchema,
    kilde: kontrollsakKildeSchema,
    misbruktype: z.array(kontrollsakMisbrukstypeSchema),
    prioritet: kontrollsakPrioritetSchema,
    ytelser: z.array(kontrollsakYtelseSchema),
    merking: z.string().nullable(),
    oppgaver: z.array(oppgaveKortSchema).default([]),
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
  sakId: z.number().nullable().optional(),
  kategori: kontrollsakKategoriSchema.nullable().optional(),
  prioritet: kontrollsakPrioritetSchema.nullable().optional(),
  status: kontrollsakStatusSchema.nullable().optional(),
  ytelseTyper: z.array(z.string()).default([]),
  kilde: kontrollsakKildeSchema.nullable().optional(),
  blokkert: blokkeringsarsakSchema.nullable().optional(),
  beskrivelse: z.string().nullable().optional(),
});

export type KontrollsakYtelse = z.infer<typeof kontrollsakYtelseSchema>;
export type KontrollsakSaksbehandler = z.infer<typeof kontrollsakSaksbehandlerSchema>;
export type KontrollsakResponse = z.infer<typeof kontrollsakResponseSchema>;
export type KontrollsakPageResponse = z.infer<typeof kontrollsakPageResponseSchema>;
export type KontrollsakStatus = z.infer<typeof kontrollsakStatusSchema>;
export type Blokkeringsarsak = z.infer<typeof blokkeringsarsakSchema>;
export type KontrollsakKategori = z.infer<typeof kontrollsakKategoriSchema>;
export type KontrollsakKilde = z.infer<typeof kontrollsakKildeSchema>;
export type KontrollsakMisbrukstype = z.infer<typeof kontrollsakMisbrukstypeSchema>;
