import { z } from "zod";

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

export const henleggelsesarsakSchema = z.enum([
  "IKKE_KAPASITET",
  "IKKE_TILSTREKKELIG_BEVISGRUNNLAG",
  "IKKE_TILSTREKKELIG_SKYLD",
  "INGEN_UTREDNING",
  "FORELDET",
]);

const kontrollsakKategoriSchema = z.string();
const kontrollsakKildeSchema = z.string();
const kontrollsakMisbrukstypeSchema = z.string();
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
  type: z.string(),
  periodeFra: z.string(),
  periodeTil: z.string(),
  belop: z.number().nullable(),
  endeligBelop: z.number().nullable(),
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

export const dokumentNodeSchema = z.object({
  id: z.string(),
  tittel: z.string(),
  endretAv: z.string(),
  endretDato: z.string(),
  låsAv: z.string().nullable(),
});

const kontrollobjektSchema = z.object({
  personIdent: z.string(),
  navn: z.string(),
  arbeidsgivere: z.array(z.object({ organisasjonsnummer: z.string() })).default([]),
  adresseskjermet: z.boolean().default(false),
});

/**
 * Normaliserer input til ny backend-kontrakt med kontrollobjekt.
 * Støtter også det gamle flate formatet (personIdent/personNavn på rotnivå)
 * for bakoverkompatibilitet med mock-data.
 */
function normaliserKontrollsakInput(input: unknown): unknown {
  if (
    input &&
    typeof input === "object" &&
    !("kontrollobjekt" in input) &&
    "personIdent" in input
  ) {
    const obj = input as Record<string, unknown>;
    return {
      ...obj,
      kontrollobjekt: {
        personIdent: obj.personIdent,
        navn: obj.personNavn ?? obj.navn ?? "Ukjent navn",
        adresseskjermet: obj.adresseskjermet,
      },
    };
  }
  return input;
}

export const kontrollsakResponseSchema = z
  .preprocess(
    normaliserKontrollsakInput,
    z.object({
      id: z.number(),
      kontrollobjekt: kontrollobjektSchema,
      saksbehandlere: saksbehandlereSchema,
      status: kontrollsakStatusSchema,
      blokkert: blokkeringsarsakSchema.nullable(),
      henleggelsesarsak: henleggelsesarsakSchema.nullable().optional().catch(null),
      kategori: kontrollsakKategoriSchema,
      kilde: kontrollsakKildeSchema,
      misbruktype: z.array(kontrollsakMisbrukstypeSchema),
      prioritet: kontrollsakPrioritetSchema,
      ytelser: z.array(kontrollsakYtelseSchema),
      merking: z.array(z.string()).default([]),
      oppgaver: z.array(oppgaveKortSchema).default([]),
      kobledeSaker: z.array(z.number()).default([]),
      dokumenter: z.array(dokumentNodeSchema).default([]),
      opprettet: z.string(),
      oppdatert: z.string().nullable(),
    }),
  )
  .transform(({ kontrollobjekt, ...sak }) => ({
    ...sak,
    personIdent: kontrollobjekt.personIdent,
    personNavn: kontrollobjekt.navn,
    arbeidsgivere: kontrollobjekt.arbeidsgivere.map((a) => a.organisasjonsnummer),
    adresseskjermet: kontrollobjekt.adresseskjermet,
    henleggelsesarsak: sak.henleggelsesarsak ?? null,
  }));

export type KontrollsakResponse = z.infer<typeof kontrollsakResponseSchema>;

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
  henleggelsesarsak: henleggelsesarsakSchema.nullable().optional().catch(null),
  beskrivelse: z.string().nullable().optional(),
  opprettetAvNavIdent: z.string().nullable().optional(),
});

export type KontrollsakYtelse = z.infer<typeof kontrollsakYtelseSchema>;
export type KontrollsakSaksbehandler = z.infer<typeof kontrollsakSaksbehandlerSchema>;
export type KontrollsakPageResponse = z.infer<typeof kontrollsakPageResponseSchema>;
export type KontrollsakStatus = z.infer<typeof kontrollsakStatusSchema>;
export type Blokkeringsarsak = z.infer<typeof blokkeringsarsakSchema>;
export type Henleggelsesarsak = z.infer<typeof henleggelsesarsakSchema>;
export type KontrollsakKategori = z.infer<typeof kontrollsakKategoriSchema>;
export type KontrollsakKilde = z.infer<typeof kontrollsakKildeSchema>;
export type KontrollsakMisbrukstype = z.infer<typeof kontrollsakMisbrukstypeSchema>;
