import type {
  Avslutningskonklusjon,
  KontrollsakHandling,
  KontrollsakResponse,
  KontrollsakStatus,
  TilgjengeligHandling,
} from "./types.backend";

function lagTilgjengeligHandling(
  handling: KontrollsakHandling,
  resultatStatus: KontrollsakStatus,
  pakrevdeFelter: TilgjengeligHandling["pakrevdeFelter"] = [],
): TilgjengeligHandling {
  return {
    handling,
    pakrevdeFelter,
    resultatStatus,
  };
}

function beregnTilgjengeligeHandlinger(
  sak: Pick<KontrollsakResponse, "status" | "saksbehandlere" | "iBero">,
): TilgjengeligHandling[] {
  if (sak.status === "AVSLUTTET") {
    return [];
  }

  if (sak.iBero) {
    if (sak.saksbehandlere.eier === null) {
      return [
        lagTilgjengeligHandling("TILDEL", sak.status, [{ felt: "navIdent", tillatteVerdier: [] }]),
        lagTilgjengeligHandling("TA_AV_BERO", sak.status),
      ];
    }

    return [
      lagTilgjengeligHandling("TA_AV_BERO", sak.status),
      lagTilgjengeligHandling("FRISTILL", sak.status),
    ];
  }

  if (sak.saksbehandlere.eier === null) {
    const handlinger = [
      lagTilgjengeligHandling("TILDEL", sak.status, [{ felt: "navIdent", tillatteVerdier: [] }]),
    ];

    if (kanSettesPåBero(sak.status)) {
      handlinger.push(lagTilgjengeligHandling("SETT_BERO", sak.status));
    }

    return handlinger;
  }

  switch (sak.status) {
    case "OPPRETTET":
      return [
        lagTilgjengeligHandling("START_UTREDNING", "UTREDES"),
        lagTilgjengeligHandling("FRISTILL", "OPPRETTET"),
        lagTilgjengeligHandling("SETT_BERO", "OPPRETTET"),
      ];
    case "UTREDES":
      return [
        lagTilgjengeligHandling("SETT_VENTER_PA_INFORMASJON", "VENTER_PA_INFORMASJON"),
        lagTilgjengeligHandling("SETT_VENTER_PA_VEDTAK", "VENTER_PA_VEDTAK"),
        lagTilgjengeligHandling("SETT_ANMELDELSE_VURDERES", "ANMELDELSE_VURDERES"),
        lagTilgjengeligHandling("SETT_HENLAGT", "HENLAGT"),
        lagTilgjengeligHandling("SETT_BERO", "UTREDES"),
        lagTilgjengeligHandling("FRISTILL", "UTREDES"),
      ];
    case "VENTER_PA_INFORMASJON":
      return [
        lagTilgjengeligHandling("START_UTREDNING", "UTREDES"),
        lagTilgjengeligHandling("SETT_BERO", "VENTER_PA_INFORMASJON"),
        lagTilgjengeligHandling("FRISTILL", "VENTER_PA_INFORMASJON"),
      ];
    case "VENTER_PA_VEDTAK":
      return [
        lagTilgjengeligHandling("SETT_ANMELDELSE_VURDERES", "ANMELDELSE_VURDERES"),
        lagTilgjengeligHandling("SETT_HENLAGT", "HENLAGT"),
        lagTilgjengeligHandling("SETT_BERO", "VENTER_PA_VEDTAK"),
        lagTilgjengeligHandling("FRISTILL", "VENTER_PA_VEDTAK"),
      ];
    case "ANMELDELSE_VURDERES":
      return [
        lagTilgjengeligHandling("SETT_ANMELDT", "ANMELDT"),
        lagTilgjengeligHandling("SETT_HENLAGT", "HENLAGT"),
        lagTilgjengeligHandling("START_UTREDNING", "UTREDES"),
        lagTilgjengeligHandling("SETT_BERO", "ANMELDELSE_VURDERES"),
        lagTilgjengeligHandling("FRISTILL", "ANMELDELSE_VURDERES"),
      ];
    case "ANMELDT":
      return [
        lagTilgjengeligHandling("AVSLUTT_MED_KONKLUSJON", "AVSLUTTET", [
          {
            felt: "avslutningskonklusjon",
            tillatteVerdier: ["POLITIET_HENLA", "FRIFUNNET", "DOMFELT"],
          },
        ]),
        lagTilgjengeligHandling("FRISTILL", "ANMELDT"),
      ];
    case "HENLAGT":
      return [
        lagTilgjengeligHandling("AVSLUTT", "AVSLUTTET"),
        lagTilgjengeligHandling("FRISTILL", "HENLAGT"),
      ];
  }
}

export function nullstillMockStatushistorikk() {}

export function oppdaterTilgjengeligeHandlinger(sak: KontrollsakResponse): KontrollsakResponse {
  sak.tilgjengeligeHandlinger = beregnTilgjengeligeHandlinger(sak);
  return sak;
}

function erGyldigUuid(verdi: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(verdi);
}

function hentSaknummer(fixtureId: string): bigint {
  const siffer = fixtureId.replace(/\D/g, "");

  if (!siffer) {
    throw new Error(`Kunne ikke utlede saksnummer fra fixture-id ${fixtureId}`);
  }

  return BigInt(siffer);
}

function lagMockUuid(verdi: bigint | number): string {
  return `00000000-0000-4000-8000-${String(verdi).padStart(12, "0")}`;
}

function lagEntityBase(fixtureId: string, namespace: number): bigint {
  return BigInt(namespace) * 1_000_000n + hentSaknummer(fixtureId) * 1_000n;
}

export function lagMockSakUuid(fixtureId: string, namespace: number): string {
  return lagMockUuid(lagEntityBase(fixtureId, namespace));
}

function lagMockEntityUuid(fixtureId: string, namespace: number, offset = 0): string {
  return lagMockUuid(lagEntityBase(fixtureId, namespace) + BigInt(offset));
}

type LegacyKontrollsak = Record<string, unknown>;

function normaliserLegacySaksbehandler(
  saksbehandler: unknown,
): KontrollsakResponse["saksbehandlere"]["deltMed"][number] | null {
  if (!saksbehandler || typeof saksbehandler !== "object") {
    return null;
  }

  const typed = saksbehandler as Record<string, unknown>;

  if (typeof typed.navn !== "string" || typeof typed.navIdent !== "string") {
    return null;
  }

  return {
    navn: typed.navn,
    navIdent: typed.navIdent,
    enhet: typeof typed.enhet === "string" ? typed.enhet : null,
  };
}

function normaliserLegacyEier(
  sak: LegacyKontrollsak,
): KontrollsakResponse["saksbehandlere"]["eier"] {
  return (
    normaliserLegacySaksbehandler(
      (sak as { saksbehandlere?: { eier?: unknown; ansvarlig?: unknown } }).saksbehandlere?.eier ??
        (sak as { saksbehandlere?: { eier?: unknown; ansvarlig?: unknown } }).saksbehandlere
          ?.ansvarlig,
    ) ?? null
  );
}

function normaliserLegacyOpprettetAv(
  sak: LegacyKontrollsak,
  saksbehandlerNavn: string,
  saksbehandlerEnhet: string | null,
): KontrollsakResponse["saksbehandlere"]["opprettetAv"] {
  const opprettetAv = normaliserLegacySaksbehandler(
    (sak as { saksbehandlere?: { opprettetAv?: unknown } }).saksbehandlere?.opprettetAv,
  );

  if (opprettetAv) {
    return opprettetAv;
  }

  return {
    navIdent: typeof sak.saksbehandler === "string" ? sak.saksbehandler : "Z999999",
    navn: saksbehandlerNavn,
    enhet: saksbehandlerEnhet,
  };
}

export function normaliserLegacyKontrollsak(
  sak: LegacyKontrollsak,
  namespace: number,
): KontrollsakResponse {
  const id = String(sak.id);
  const personNavn = typeof sak.navn === "string" ? sak.navn : "Ukjent navn";
  const saksbehandlerNavn = typeof sak.saksbehandler === "string" ? sak.saksbehandler : "Ukjent";
  const saksbehandlerEnhet = typeof sak.mottakEnhet === "string" ? sak.mottakEnhet : null;
  const legacyYtelser = Array.isArray(sak.ytelser) ? sak.ytelser : [];
  const legacyDelteSaksbehandlere = Array.isArray(
    (sak as { saksbehandlere?: { deltMed?: unknown } }).saksbehandlere?.deltMed,
  )
    ? (sak as { saksbehandlere: { deltMed: unknown[] } }).saksbehandlere.deltMed
    : [];
  const legacyStatus = typeof sak.status === "string" ? sak.status : "OPPRETTET";
  const legacyKategori = typeof sak.kategori === "string" ? sak.kategori : "ANNET";
  const legacyKilde =
    typeof (sak as { bakgrunn?: { kilde?: unknown } }).bakgrunn?.kilde === "string"
      ? String((sak as { bakgrunn?: { kilde?: unknown } }).bakgrunn?.kilde)
      : null;

  const statusMap: Record<string, KontrollsakResponse["status"]> = {
    OPPRETTET: "OPPRETTET",
    AVKLART: "OPPRETTET",
    UTREDES: "UTREDES",
    TIL_FORVALTNING: "VENTER_PA_VEDTAK",
    HENLAGT: "HENLAGT",
    AVSLUTTET: "AVSLUTTET",
    I_BERO: "OPPRETTET",
    VENTER_PA_INFORMASJON: "VENTER_PA_INFORMASJON",
    VENTER_PA_VEDTAK: "VENTER_PA_VEDTAK",
    ANMELDELSE_VURDERES: "ANMELDELSE_VURDERES",
    ANMELDT: "ANMELDT",
  };

  const kildeMap: Record<string, KontrollsakResponse["kilde"]> = {
    INTERN: "NAV_KONTROLL",
    EKSTERN: "ANNET",
    ANONYM_TIPS: "PUBLIKUM",
    PUBLIKUM: "PUBLIKUM",
    NAV_KONTROLL: "NAV_KONTROLL",
    NAV_OVRIG: "NAV_OVRIG",
    REGISTERSAMKJORING: "REGISTERSAMKJORING",
    A_KRIMSAMARBEID: "A_KRIMSAMARBEID",
    POLITIET: "POLITIET",
    SKATTEETATEN: "SKATTEETATEN",
    UTLENDINGSMYNDIGHETEN: "UTLENDINGSMYNDIGHETEN",
    UTENRIKSTJENESTEN: "UTENRIKSTJENESTEN",
    STATENS_VEGVESEN: "STATENS_VEGVESEN",
    KOMMUNE: "KOMMUNE",
    BANK_OG_FINANS: "BANK_OG_FINANS",
    ANNET: "ANNET",
  };

  const misbruktypeMap: Record<string, string> = {
    "Behandler §25-7": "BEHANDLER_25_7",
    "L-takster": "L_TAKSTER_BEHANDLER",
    Behandler: "BEHANDLER_25_7",
    "L-takster foretak": "L_TAKSTER_FORETAK",
    "Hvit inntekt": "HVIT_INNTEKT",
    "Fiktivt arbeidsforhold": "FIKTIVT_ARBEIDSFORHOLD",
    "Svart arbeid": "SVART_ARBEID",
    "Feil inntektsgrunnlag": "FEIL_INNTEKTSGRUNNLAG",
    "Skjult aktivitet": "SKJULT_AKTIVITET",
    "Skjult samliv": "SKJULT_SAMLIV",
    "Endret sivilstatus": "ENDRET_SIVILSTATUS",
    "Medlemskap bortfalt": "MEDLEMSKAP_BORTFALT",
    "Innenfor EØS": "INNENFOR_EOS",
    "Utenfor EØS": "UTENFOR_EOS",
    Identitetsmisbruk: "IDENTITETSMISBRUK",
    "Opphold på feil grunnlag": "OPPHOLD_PAA_FEIL_GRUNNLAG",
    "Misbruk av tiltaksplass": "MISBRUK_AV_TILTAKSPLASS",
    "Avbrutt tiltak": "AVBRUTT_TILTAK",
  };

  const normalisertStatus = statusMap[legacyStatus] ?? "OPPRETTET";
  const iBero = legacyStatus === "I_BERO";
  const opprettetAv = normaliserLegacyOpprettetAv(sak, saksbehandlerNavn, saksbehandlerEnhet);
  const eier = normaliserLegacyEier(sak);
  const avslutningskonklusjon =
    typeof (sak as { avslutningskonklusjon?: unknown }).avslutningskonklusjon === "string"
      ? ((sak as { avslutningskonklusjon: unknown }).avslutningskonklusjon as Avslutningskonklusjon)
      : null;

  const normalisert: KontrollsakResponse = {
    id: erGyldigUuid(id) ? id : lagMockEntityUuid(id, namespace),
    personIdent: String(sak.personIdent ?? ""),
    personNavn,
    saksbehandlere: {
      eier,
      deltMed: legacyDelteSaksbehandlere
        .map(normaliserLegacySaksbehandler)
        .filter((saksbehandler): saksbehandler is NonNullable<typeof saksbehandler> =>
          Boolean(saksbehandler),
        ),
      opprettetAv,
    },
    status: normalisertStatus,
    iBero,
    avslutningskonklusjon,
    tilgjengeligeHandlinger: [],
    kategori: (legacyKategori in
    {
      BEHANDLER: true,
      ARBEID: true,
      SAMLIV: true,
      UTLAND: true,
      IDENTITET: true,
      TILTAK: true,
      DOKUMENTFALSK: true,
      ANNET: true,
    }
      ? legacyKategori
      : "ANNET") as KontrollsakResponse["kategori"],
    kilde: kildeMap[legacyKilde ?? "ANNET"] ?? "ANNET",
    misbruktype: (Array.isArray(sak.misbrukstyper) ? sak.misbrukstyper : [])
      .map((verdi) => misbruktypeMap[String(verdi)])
      .filter((verdi): verdi is KontrollsakResponse["misbruktype"][number] => Boolean(verdi)),
    prioritet:
      sak.prioritet === "LAV" || sak.prioritet === "NORMAL" || sak.prioritet === "HOY"
        ? sak.prioritet
        : "NORMAL",
    ytelser: legacyYtelser.map((ytelse, indeks) => {
      const typed = ytelse as Record<string, unknown>;
      return {
        id:
          typeof typed.id === "string" && erGyldigUuid(typed.id)
            ? typed.id
            : lagMockEntityUuid(id, namespace, 100 + indeks + 1),
        type: String(typed.type ?? "Ukjent ytelse"),
        periodeFra: String(typed.periodeFra ?? "1970-01-01"),
        periodeTil: String(typed.periodeTil ?? typed.periodeFra ?? "1970-01-01"),
        belop:
          typeof typed.belop === "number"
            ? typed.belop
            : typeof sak.belop === "number" && indeks === 0
              ? sak.belop
              : null,
      };
    }),
    merking: Array.isArray(sak.merking)
      ? String(sak.merking[0] ?? "") || null
      : typeof sak.merking === "string"
        ? sak.merking
        : null,
    resultat:
      sak.resultat && typeof sak.resultat === "object"
        ? {
            utredning: (sak.resultat as { utredning?: Record<string, unknown> | null }).utredning
              ? {
                  id: String((sak.resultat as { utredning: Record<string, unknown> }).utredning.id),
                  opprettet: String(
                    (sak.resultat as { utredning: Record<string, unknown> }).utredning.opprettet ??
                      (sak.resultat as { utredning: Record<string, unknown> }).utredning.dato ??
                      sak.opprettet,
                  ),
                  resultat: String(
                    (sak.resultat as { utredning: Record<string, unknown> }).utredning.resultat ??
                      "INFOSAK",
                  ),
                }
              : null,
            forvaltning: (sak.resultat as { forvaltning?: Record<string, unknown> | null })
              .forvaltning
              ? {
                  id: String(
                    (sak.resultat as { forvaltning: Record<string, unknown> }).forvaltning.id,
                  ),
                  dato: String(
                    (sak.resultat as { forvaltning: Record<string, unknown> }).forvaltning.dato,
                  ),
                  resultat: String(
                    (sak.resultat as { forvaltning: Record<string, unknown> }).forvaltning.resultat,
                  ),
                }
              : null,
            strafferettsligVurdering: (
              sak.resultat as { strafferettsligVurdering?: Record<string, unknown> | null }
            ).strafferettsligVurdering
              ? {
                  id: String(
                    (
                      sak.resultat as {
                        strafferettsligVurdering: Record<string, unknown>;
                      }
                    ).strafferettsligVurdering.id,
                  ),
                  dato: String(
                    (
                      sak.resultat as {
                        strafferettsligVurdering: Record<string, unknown>;
                      }
                    ).strafferettsligVurdering.dato,
                  ),
                  resultat: String(
                    (
                      sak.resultat as {
                        strafferettsligVurdering: Record<string, unknown>;
                      }
                    ).strafferettsligVurdering.resultat,
                  ),
                }
              : null,
          }
        : null,
    opprettet: String(sak.opprettet ?? new Date().toISOString()),
    oppdatert: typeof sak.oppdatert === "string" ? sak.oppdatert : null,
  };

  return oppdaterTilgjengeligeHandlinger(normalisert);
}

function kanSettesPåBero(status: KontrollsakStatus): boolean {
  return (
    status === "OPPRETTET" ||
    status === "UTREDES" ||
    status === "VENTER_PA_INFORMASJON" ||
    status === "VENTER_PA_VEDTAK" ||
    status === "ANMELDELSE_VURDERES"
  );
}
