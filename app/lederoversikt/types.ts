import { z } from "zod";

export const LEDERSTATISTIKK_STEG = [
  "OPPRETTET",
  "UTREDNING",
  "FORVALTNING",
  "STRAFFERETTSLIG_VURDERING",
  "POLITI",
] as const;

const lederStatusSchema = z.enum([
  "UTEN_STATUS",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "VENTER_PA_RESULTAT",
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
    perSteg: z.object({
      OPPRETTET: antallSchema,
      UTREDNING: antallSchema,
      FORVALTNING: antallSchema,
      STRAFFERETTSLIG_VURDERING: antallSchema,
      POLITI: antallSchema,
    }),
    perStatus: z.object({
      UTEN_STATUS: antallSchema,
      VENTER_PA_INFORMASJON: antallSchema,
      VENTER_PA_VEDTAK: antallSchema,
      VENTER_PA_RESULTAT: antallSchema,
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

export type LederStatus = z.infer<typeof lederStatusSchema>;
export type LederStatistikk = z.infer<typeof lederStatistikkResponseSchema>;
export type LederAnsattStatistikk = LederStatistikk["ansatte"]["liste"][number];
export type LederAnsatteStatistikk = LederStatistikk["ansatte"];
export type LederEnhetStatistikk = LederStatistikk["enhet"];
