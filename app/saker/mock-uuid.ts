import type { Blokkeringsarsak, KontrollsakResponse, KontrollsakStatus } from "./types.backend";

export function nullstillMockStatushistorikk() {}

/** Ingen-op etter migrering til ny modell – beholdes for bakoverkompatibilitet i tester */
export function oppdaterTilgjengeligeHandlinger(sak: KontrollsakResponse): KontrollsakResponse {
  return sak;
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

export function normaliserLegacyKontrollsak(sak: LegacyKontrollsak): KontrollsakResponse {
  const id = String(sak.id);
  const numericId = Number.parseInt(id.replace(/\D/g, ""), 10) || 0;
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
    TIL_FORVALTNING: "UTREDES",
    HENLAGT: "HENLAGT",
    AVSLUTTET: "AVSLUTTET",
    I_BERO: "OPPRETTET",
    VENTER_PA_INFORMASJON: "UTREDES",
    VENTER_PA_VEDTAK: "UTREDES",
    ANMELDELSE_VURDERES: "STRAFFERETTSLIG_VURDERING",
    ANMELDT: "ANMELDT",
    STRAFFERETTSLIG_VURDERING: "STRAFFERETTSLIG_VURDERING",
  };

  const blokkertMap: Record<string, Blokkeringsarsak | null> = {
    I_BERO: "I_BERO",
    VENTER_PA_INFORMASJON: "VENTER_PA_INFORMASJON",
    VENTER_PA_VEDTAK: "VENTER_PA_VEDTAK",
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

  const normalisertStatus: KontrollsakStatus = statusMap[legacyStatus] ?? "OPPRETTET";
  const blokkert: Blokkeringsarsak | null = blokkertMap[legacyStatus] ?? null;
  const opprettetAv = normaliserLegacyOpprettetAv(sak, saksbehandlerNavn, saksbehandlerEnhet);
  const eier = normaliserLegacyEier(sak);

  const normalisert: KontrollsakResponse = {
    id: numericId,
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
    blokkert,
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
        id: crypto.randomUUID(),
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
    oppgaver: [],
    opprettet: String(sak.opprettet ?? new Date().toISOString()),
    oppdatert: typeof sak.oppdatert === "string" ? sak.oppdatert : null,
  };

  return normalisert;
}
