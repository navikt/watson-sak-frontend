import { z } from "zod";

export const LEDERSTATISTIKK_STATUSER = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
] as const;

const lederArbeidsstatusSchema = z.enum([
  "IKKE_BLOKKERT",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "I_BERO",
]);

const antallSchema = z.number().int().nonnegative();

const sakstallSchema = z.object({
  totaltAntallIkkeAvsluttede: antallSchema,
  antallOverFrist: antallSchema,
});

export const lederStatistikkResponseSchema = z.object({
  enhetId: z.string().min(1),
  enhetNavn: z.string().min(1),
  enhet: sakstallSchema.extend({
    perStatus: z.object({
      OPPRETTET: antallSchema,
      UTREDES: antallSchema,
      STRAFFERETTSLIG_VURDERING: antallSchema,
      ANMELDT: antallSchema,
      HENLAGT: antallSchema,
    }),
    perArbeidsstatus: z.object({
      IKKE_BLOKKERT: antallSchema,
      VENTER_PA_INFORMASJON: antallSchema,
      VENTER_PA_VEDTAK: antallSchema,
      I_BERO: antallSchema,
    }),
    antallUfordelte: antallSchema,
  }),
  ansatte: z.object({
    tilgjengelig: z.boolean(),
    liste: z.array(
      sakstallSchema.extend({
        navn: z.string().min(1),
        navIdent: z.string().min(1),
      }),
    ),
    ufordelt: sakstallSchema,
  }),
});

export type LederArbeidsstatus = z.infer<typeof lederArbeidsstatusSchema>;
export type LederStatistikk = z.infer<typeof lederStatistikkResponseSchema>;
export type LederAnsattStatistikk = LederStatistikk["ansatte"]["liste"][number];
export type LederAnsatteStatistikk = LederStatistikk["ansatte"];
export type LederEnhetStatistikk = LederStatistikk["enhet"];
