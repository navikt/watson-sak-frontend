export const kontrollsakKategoriVerdier = [
  "BEHANDLER",
  "ARBEID",
  "SAMLIV",
  "UTLAND",
  "IDENTITET",
  "TILTAK",
  "DOKUMENTFALSK",
  "ANNET",
] as const;

type KontrollsakKategoriVerdi = (typeof kontrollsakKategoriVerdier)[number];

export const kontrollsakMisbrukstypeVerdier = [
  "BEHANDLER_25_7",
  "L_TAKSTER_BEHANDLER",
  "L_TAKSTER_FORETAK",
  "HVIT_INNTEKT",
  "FIKTIVT_ARBEIDSFORHOLD",
  "SVART_ARBEID",
  "FEIL_INNTEKTSGRUNNLAG",
  "SKJULT_AKTIVITET",
  "SKJULT_SAMLIV",
  "ENDRET_SIVILSTATUS",
  "MEDLEMSKAP_BORTFALT",
  "INNENFOR_EOS",
  "UTENFOR_EOS",
  "IDENTITETSMISBRUK",
  "OPPHOLD_PAA_FEIL_GRUNNLAG",
  "MISBRUK_AV_TILTAKSPLASS",
  "AVBRUTT_TILTAK",
] as const;

export const kontrollsakKildeVerdier = [
  "PUBLIKUM",
  "NAV_KONTROLL",
  "NAV_OVRIG",
  "REGISTERSAMKJORING",
  "A_KRIMSAMARBEID",
  "POLITIET",
  "SKATTEETATEN",
  "UTLENDINGSMYNDIGHETEN",
  "UTENRIKSTJENESTEN",
  "STATENS_VEGVESEN",
  "KOMMUNE",
  "BANK_OG_FINANS",
  "ANNET",
] as const;

type KontrollsakMisbrukstypeVerdi = (typeof kontrollsakMisbrukstypeVerdier)[number];

export const kontrollsakKategoriEtiketter: Record<KontrollsakKategoriVerdi, string> = {
  BEHANDLER: "Behandler",
  ARBEID: "Arbeid",
  SAMLIV: "Samliv",
  UTLAND: "Utland",
  IDENTITET: "Identitet",
  TILTAK: "Tiltak",
  DOKUMENTFALSK: "Dokumentfalsk",
  ANNET: "Annet",
};

export const kontrollsakMisbrukstypeEtiketter: Record<KontrollsakMisbrukstypeVerdi, string> = {
  BEHANDLER_25_7: "Behandler §25-7",
  L_TAKSTER_BEHANDLER: "L-takster behandler",
  L_TAKSTER_FORETAK: "L-takster foretak",
  HVIT_INNTEKT: "Hvit inntekt",
  FIKTIVT_ARBEIDSFORHOLD: "Fiktivt arbeidsforhold",
  SVART_ARBEID: "Svart arbeid",
  FEIL_INNTEKTSGRUNNLAG: "Feil inntektsgrunnlag",
  SKJULT_AKTIVITET: "Skjult aktivitet",
  SKJULT_SAMLIV: "Skjult samliv",
  ENDRET_SIVILSTATUS: "Endret sivilstatus",
  MEDLEMSKAP_BORTFALT: "Medlemskap bortfalt",
  INNENFOR_EOS: "Innenfor EØS",
  UTENFOR_EOS: "Utenfor EØS",
  IDENTITETSMISBRUK: "Identitetsmisbruk",
  OPPHOLD_PAA_FEIL_GRUNNLAG: "Opphold på feil grunnlag",
  MISBRUK_AV_TILTAKSPLASS: "Misbruk av tiltaksplass",
  AVBRUTT_TILTAK: "Avbrutt tiltak",
};

export const misbrukstyperPerKategori: Partial<
  Record<KontrollsakKategoriVerdi, readonly KontrollsakMisbrukstypeVerdi[]>
> = {
  BEHANDLER: ["BEHANDLER_25_7", "L_TAKSTER_BEHANDLER", "L_TAKSTER_FORETAK"],
  ARBEID: [
    "HVIT_INNTEKT",
    "FIKTIVT_ARBEIDSFORHOLD",
    "SVART_ARBEID",
    "FEIL_INNTEKTSGRUNNLAG",
    "SKJULT_AKTIVITET",
  ],
  SAMLIV: ["SKJULT_SAMLIV", "ENDRET_SIVILSTATUS"],
  UTLAND: ["MEDLEMSKAP_BORTFALT", "INNENFOR_EOS", "UTENFOR_EOS"],
  IDENTITET: ["IDENTITETSMISBRUK", "OPPHOLD_PAA_FEIL_GRUNNLAG"],
  TILTAK: ["MISBRUK_AV_TILTAKSPLASS", "AVBRUTT_TILTAK"],
};
