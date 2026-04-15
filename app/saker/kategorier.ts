export const kontrollsakKategoriVerdier = [
  "UDEFINERT",
  "FEILUTBETALING",
  "MISBRUK",
  "OPPFOLGING",
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
  UDEFINERT: "Udefinert",
  FEILUTBETALING: "Feilutbetaling",
  MISBRUK: "Misbruk",
  OPPFOLGING: "Oppfølging",
};

export const misbrukstyperPerKategori: Partial<
  Record<KontrollsakKategoriVerdi, readonly KontrollsakMisbrukstypeVerdi[]>
> = {
  FEILUTBETALING: ["Hvit inntekt", "Feil inntektsgrunnlag", "Endret sivilstatus"],
  MISBRUK: [
    "Skjult samliv",
    "Svart arbeid",
    "Fiktivt arbeidsforhold",
    "Utenfor EØS",
    "Innenfor EØS",
    "Identitetsmisbruk",
  ],
  OPPFOLGING: ["Misbruk av tiltaksplass", "Avbrutt tiltak"],
};
