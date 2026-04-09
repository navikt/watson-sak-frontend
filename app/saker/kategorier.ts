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
  "Behandler §25-7",
  "L-takster",
  "Behandler",
  "L-takster foretak",
  "Hvit inntekt",
  "Fiktivt arbeidsforhold",
  "Svart arbeid",
  "Feil inntektsgrunnlag",
  "Skjult samliv",
  "Endret sivilstatus",
  "Medlemskap bortfalt",
  "Innenfor EØS",
  "Utenfor EØS",
  "Identitetsmisbruk",
  "Opphold på feil grunnlag",
  "Misbruk av tiltaksplass",
  "Avbrutt tiltak",
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

export const misbrukstyperPerKategori: Partial<
  Record<KontrollsakKategoriVerdi, readonly KontrollsakMisbrukstypeVerdi[]>
> = {
  BEHANDLER: ["Behandler §25-7", "L-takster", "Behandler", "L-takster foretak"],
  ARBEID: ["Hvit inntekt", "Fiktivt arbeidsforhold", "Svart arbeid", "Feil inntektsgrunnlag"],
  SAMLIV: ["Skjult samliv", "Endret sivilstatus"],
  UTLAND: ["Medlemskap bortfalt", "Innenfor EØS", "Utenfor EØS"],
  IDENTITET: ["Identitetsmisbruk", "Opphold på feil grunnlag"],
  TILTAK: ["Misbruk av tiltaksplass", "Avbrutt tiltak"],
};
