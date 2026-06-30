/**
 * Oppslagstabeller for visning av kodeverk-koder som menneskelige etiketter.
 * Brukes som fallback der kodeverk-data fra backend ikke er tilgjengelig.
 * Ukjente koder vises som de er.
 */
export const kontrollsakYtelseTypeEtiketter: Record<string, string> = {
  DAGPENGER: "Dagpenger",
  SYKEPENGER: "Sykepenger",
  BARNETRYGD: "Barnetrygd",
  AAP: "AAP",
  FORELDREPENGER: "Foreldrepenger",
  ANDRE: "Andre",
};

export const kontrollsakKategoriEtiketter: Record<string, string> = {
  BEHANDLER: "Behandler",
  ARBEID: "Arbeid",
  SAMLIV: "Samliv",
  UTLAND: "Utland",
  IDENTITET: "Identitet",
  TILTAK: "Tiltak",
  DOKUMENTFALSK: "Dokumentfalsk",
  ANNET: "Annet",
};

export const kontrollsakKildeEtiketter: Record<string, string> = {
  PUBLIKUM: "Publikum",
  NAV_KONTROLL: "Nav kontroll",
  NAV_OVRIG: "Nav øvrig",
  REGISTERSAMKJORING: "Registersamkjøring",
  A_KRIMSAMARBEID: "A-krimsamarbeid",
  POLITIET: "Politiet",
  SKATTEETATEN: "Skatteetaten",
  UTLENDINGSMYNDIGHETEN: "Utlendingsmyndighetene",
  UTENRIKSTJENESTEN: "Utenrikstjenesten",
  STATENS_VEGVESEN: "Statens vegvesen",
  KOMMUNE: "Kommune",
  BANK_OG_FINANS: "Bank og finans",
  ANNET: "Annet",
};

export const kontrollsakMisbrukstypeEtiketter: Record<string, string> = {
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

/**
 * Slår opp en menneskelig etikett for en merkingskode.
 * Kjente koder har faste etiketter; ukjente koder vises som de er.
 */
const kjenteMerkingEtiketter: Record<string, string> = {
  LIME: "Lime",
  REGMAN: "Regman",
  A_KRIM: "A-krim",
};

export function merkingEtikett(kode: string): string {
  return kjenteMerkingEtiketter[kode] ?? kode;
}
