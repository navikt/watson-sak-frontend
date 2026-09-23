import { z } from "zod";

const kontrollsakStegSchema = z.enum([
  "OPPRETTET",
  "UTREDNING",
  // Eldre mock- og historikkdata bruker fortsatt disse verdiene.
  "UTREDES",
  "FORVALTNING",
  "STRAFFERETTSLIG_VURDERING",
  "POLITI",
  "ANMELDT",
  "AVSLUTTET",
]);

export const kontrollsakStatusSchema = z.enum([
  "AKTIV",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "VENTER_PA_RESULTAT",
  "I_BERO",
]);

const kontrollsakKategoriSchema = z.string();
const kontrollsakKildeSchema = z.string();
const kontrollsakMisbrukstypeSchema = z.string();
const kontrollsakPrioritetSchema = z.enum(["LAV", "NORMAL", "HOY"]);

const resultatTypeSchema = z.enum([
  "KONTROLLNOTAT",
  "FEILUTBETALINGSSAK_ORDINAER",
  "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK",
  "HENLAGT",
  "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
  "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
  "ANMELDT",
  "FORELEGG",
  "BOT",
  "PATALEUNNLATELSE",
  "FRIFINNELSE",
  "DOMFELLELSE",
]);
export type ResultatType = z.infer<typeof resultatTypeSchema>;

const henleggelsesarsakSchema = z.string();

const endeligUtfallResponseSchema = z.object({
  type: z.string(),
  henleggelsesarsak: z.string().nullable().optional(),
});

const resultatResponseSchema = z.object({
  utredning: z
    .object({
      type: z.string(),
      belop: z.number().nullable().optional(),
      henleggelsesarsak: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  forvaltning: z
    .object({
      type: z.string(),
      endeligUtfall: endeligUtfallResponseSchema.nullable().optional(),
    })
    .nullable()
    .optional(),
  strafferettsligVurdering: z
    .object({
      type: z.string(),
      henleggelsesarsak: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  politi: z
    .object({
      type: z.string(),
      begrunnelse: z.string().nullable().optional(),
      detaljer: z.string().nullable().optional(),
      domstype: z.string().nullable().optional(),
      varighet: z.string().nullable().optional(),
      redusertForEmkArtikkel6: z.boolean().nullable().optional(),
      redusertForLangSaksbehandling: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  endeligUtfall: endeligUtfallResponseSchema.nullable().optional(),
});

const lagreResultatRequestSchema = z.object({
  versjon: z.literal(1),
  steg: kontrollsakStegSchema,
  utredning: z
    .object({
      type: z.enum([
        "KONTROLLNOTAT",
        "FEILUTBETALINGSSAK_ORDINAER",
        "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK",
        "HENLAGT",
      ]),
      henleggelsesarsak: henleggelsesarsakSchema.optional(),
    })
    .optional(),
  forvaltning: z
    .object({
      type: z.enum([
        "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
        "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
      ]),
      endeligUtfall: z
        .object({
          type: z.enum(["FEILUTBETALINGSSAK_ORDINAER", "KONTROLLNOTAT", "HENLAGT"]),
          henleggelsesarsak: henleggelsesarsakSchema.optional(),
        })
        .optional(),
    })
    .optional(),
  strafferettsligVurdering: z
    .object({
      type: z.enum(["ANMELDT", "KONTROLLNOTAT", "FEILUTBETALINGSSAK_ORDINAER", "HENLAGT"]),
      henleggelsesarsak: henleggelsesarsakSchema.optional(),
    })
    .optional(),
  politi: z
    .object({
      type: z.enum([
        "HENLAGT",
        "FORELEGG",
        "BOT",
        "PATALEUNNLATELSE",
        "FRIFINNELSE",
        "DOMFELLELSE",
      ]),
      begrunnelse: z.string().optional(),
      detaljer: z.string().optional(),
      domstype: z.string().optional(),
      varighet: z.string().optional(),
      redusertForEmkArtikkel6: z.boolean().optional(),
      redusertForLangSaksbehandling: z.boolean().optional(),
    })
    .optional(),
  ytelser: z
    .array(
      z.object({
        id: z.string().uuid(),
        belop: z.number().nonnegative().optional(),
        endeligBelop: z.number().nonnegative().optional(),
      }),
    )
    .optional(),
});

export type LagreResultatRequest = z.infer<typeof lagreResultatRequestSchema>;

export const tillatteHandlingerResponseSchema = z.object({
  versjon: z.number(),
  tilstand: z.object({
    steg: kontrollsakStegSchema,
    status: kontrollsakStatusSchema.nullable(),
    statusFørBero: kontrollsakStatusSchema.nullable(),
    resultat: resultatResponseSchema.nullable(),
    ytelser: z.array(
      z.object({
        id: z.string().uuid(),
        type: z.string(),
        periodeFra: z.string().nullable(),
        periodeTil: z.string().nullable(),
        belop: z.number().nullable(),
        endeligBelop: z.number().nullable(),
      }),
    ),
  }),
  handlinger: z.array(
    z.object({
      type: z.enum([
        "FLYTT_TIL_NESTE_STEG",
        "ENDRE_STATUS",
        "REGISTRER_RESULTAT",
        "HENLEGG",
        "SETT_I_BERO",
        "TA_UT_AV_BERO",
      ]),
      metode: z.enum(["POST", "PUT"]),
      sti: z.string(),
      resultatType: resultatTypeSchema.nullable().optional(),
    }),
  ),
  tillatteSteg: z.array(kontrollsakStegSchema),
  tillatteStatuser: z.array(kontrollsakStatusSchema.nullable()),
  tillatteResultater: z.array(resultatTypeSchema),
  paakrevdeRegistreringer: z.array(z.string()),
  paakrevdeRegistreringerPerSteg: z.record(z.string(), z.array(z.string())),
  feltskjema: z.array(
    z.object({
      felt: z.string(),
      etikett: z.string(),
      datatype: z.enum(["enum", "tekst", "boolsk", "belop"]),
      paakrevd: z.boolean(),
      paakrevdNar: z.string().nullable().optional(),
      verdier: z.array(z.object({ verdi: z.string(), etikett: z.string() })).default([]),
    }),
  ),
});

export type TillatteHandlingerResponse = z.infer<typeof tillatteHandlingerResponseSchema>;

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
  id: z.string().uuid().optional(),
  type: z.string(),
  periodeFra: z.string().nullable(),
  periodeTil: z.string().nullable(),
  belop: z.number().nullable(),
  endeligBelop: z.number().nullable(),
});

const kontrollsakSaksbehandlerSchema = z.object({
  navIdent: z.string(),
  navn: z.string(),
  enhet: z.string().nullable(),
});

export const oppgaveKortSchema = z.object({
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
  opprettetAv: z.string(),
  opprettetDato: z.string(),
  endretAv: z.string(),
  endretDato: z.string(),
  låsAv: z.string().nullable(),
  arkivert: z.string().nullish(),
  arkivertAv: z.string().nullish(),
  arkivertJournalpostId: z.string().nullish(),
});

const historiskIdentSchema = z.object({
  personIdent: z.string(),
  type: z.string(),
  historisk: z.boolean(),
});

const kontrollobjektSchema = z.object({
  personIdent: z.string(),
  gjeldendePersonIdent: z.string().nullable().default(null),
  navn: z.string(),
  historiskeIdenter: z.array(historiskIdentSchema).default([]),
  arbeidsgivere: z.array(z.object({ organisasjonsnummer: z.string() })).default([]),
  adresseskjermet: z.boolean().default(false),
});

const kontrollsakTilgangSchema = z.object({
  kreverUtvidetTilgang: z.boolean().default(false),
  kanSeHistorikk: z.boolean().default(true),
  kanSeRelaterteSaker: z.boolean().default(true),
  kanTildeleSak: z.boolean().default(true),
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
      steg: kontrollsakStegSchema,
      status: kontrollsakStatusSchema.nullable(),
      statusFørBero: kontrollsakStatusSchema.nullable().optional(),
      resultat: resultatResponseSchema.nullable().optional(),
      kategori: kontrollsakKategoriSchema,
      kilde: kontrollsakKildeSchema,
      misbruktype: z.array(kontrollsakMisbrukstypeSchema),
      prioritet: kontrollsakPrioritetSchema,
      ytelser: z.array(kontrollsakYtelseSchema),
      merking: z.array(z.string()).default([]),
      oppgaver: z.array(oppgaveKortSchema).default([]),
      kobledeSaker: z.array(z.number()).default([]),
      dokumenter: z.array(dokumentNodeSchema).default([]),
      tilgang: kontrollsakTilgangSchema.optional(),
      opprettet: z.string(),
      oppdatert: z.string().nullable(),
      legacyPid: z.string().nullable().optional(),
      enhet: z.string().nullable().optional(),
    }),
  )
  .transform(({ kontrollobjekt, ...sak }) => ({
    ...sak,
    personIdent: kontrollobjekt.personIdent,
    gjeldendePersonIdent: kontrollobjekt.gjeldendePersonIdent,
    historiskeIdenter: kontrollobjekt.historiskeIdenter,
    personNavn: kontrollobjekt.navn,
    arbeidsgivere: kontrollobjekt.arbeidsgivere.map((a) => a.organisasjonsnummer),
    adresseskjermet: kontrollobjekt.adresseskjermet,
    ...(sak.tilgang ? { tilgang: sak.tilgang } : {}),
  }));

export type KontrollsakResponse = z.infer<typeof kontrollsakResponseSchema>;

export const kontrollsakPageResponseSchema = z.object({
  items: z.array(kontrollsakResponseSchema),
  page: z.number(),
  size: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

export function normaliserHistoriskHendelseInput(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input;
  }

  const hendelse = input as Record<string, unknown>;
  return {
    ...hendelse,
    steg: hendelse.steg === "HENLAGT" ? "AVSLUTTET" : hendelse.steg,
  };
}

export const kontrollsakHendelseResponseObjectSchema = z.object({
  hendelseId: z.string().uuid(),
  tidspunkt: z.string(),
  hendelsesType: z.string(),
  sakId: z.number().nullable().optional(),
  kategori: kontrollsakKategoriSchema.nullable().optional(),
  prioritet: kontrollsakPrioritetSchema.nullable().optional(),
  steg: kontrollsakStegSchema.nullable().optional(),
  ytelseTyper: z.array(z.string()).default([]),
  kilde: kontrollsakKildeSchema.nullable().optional(),
  status: kontrollsakStatusSchema.nullable().optional(),
  beskrivelse: z.string().nullable().optional(),
  tittel: z.string().nullable().optional(),
  opprettetAvNavIdent: z.string().nullable().optional(),
});

export const kontrollsakHendelseResponseSchema = z.preprocess(
  normaliserHistoriskHendelseInput,
  kontrollsakHendelseResponseObjectSchema,
);

export type KontrollsakYtelse = z.infer<typeof kontrollsakYtelseSchema>;
export type KontrollsakSaksbehandler = z.infer<typeof kontrollsakSaksbehandlerSchema>;
export type KontrollsakPageResponse = z.infer<typeof kontrollsakPageResponseSchema>;
export type KontrollsakSteg = z.infer<typeof kontrollsakStegSchema>;
export type KontrollsakStatus = z.infer<typeof kontrollsakStatusSchema>;
export type KontrollsakKategori = z.infer<typeof kontrollsakKategoriSchema>;
export type KontrollsakKilde = z.infer<typeof kontrollsakKildeSchema>;
export type KontrollsakMisbrukstype = z.infer<typeof kontrollsakMisbrukstypeSchema>;
