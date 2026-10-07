const ETIKETTER: Record<string, string> = {
  ANMELDELSE_VURDERES: "Anmeldelse vurderes",
  ANNET: "Annet",
  ARBEID: "Arbeid",
  AVKLART: "Avklart",
  AVSLUTTET: "Avsluttet",
  BEHANDLER: "Behandler",
  BELOP_UNDER_BELOPSGRENSE: "Beløp under beløpsgrense",
  BELOP_UNDER_PATALEGRENSE: "Beløp under påtalegrense",
  BEVISETS_STILLING: "Bevisets stilling",
  DOKUMENTFALSK: "Dokumentfalsk",
  FEILREGISTRERT_DUBLETT: "Feilregistrert / dublett",
  FEILUTBETALING: "Feilutbetaling",
  FEILUTBETALINGSSAK_ORDINAER: "Feilutbetaling",
  FORELDET: "Foreldet",
  FORVALTNING: "Forvaltning",
  IKKE_GRUNNLAG_FOR_TILBAKEKREVING: "Ikke grunnlag for tilbakekreving",
  IKKE_KAPASITET: "Ikke kapasitet",
  IKKE_TILSTREKKELIG_BEVISGRUNNLAG: "Ikke tilstrekkelig bevisgrunnlag",
  IKKE_TILSTREKKELIG_SKYLD: "Ikke tilstrekkelig skyld",
  INGEN_UTREDNING: "Ingen utredning",
  INTET_STRAFFBART_FORHOLD: "Intet straffbart forhold",
  KONTROLLNOTAT: "Kontrollnotat",
  POTENSIELL_STRAFFESAK: "Potensiell straffesak",
  HENLAGT: "Henlagt",
  IDENTITET: "Identitet",
  I_BERO: "I bero",
  OPPRETTET: "Opprettet",
  POLITI: "Politi",
  SAMLIV: "Samliv",
  STRAFFERETTSLIG_VURDERING: "Strafferettslig vurdering",
  TILDELT: "Tildelt",
  TILTAK: "Tiltak",
  UTLAND: "Utland",
  UTREDES: "Utredning",
  UTREDNING: "Utredning",
  VENTER_PA_INFORMASJON: "Venter på informasjon",
  PAAKLAGET: "Påklaget",
  VENTER_PA_RESULTAT: "Venter på resultat",
  VENTER_PA_VEDTAK: "Venter på vedtak",
  NAY_MANGLER_I_SAKSBEHANDLINGEN: "NAY: Mangler i saksbehandlingen",
  NFP_MANGLER_I_SAKSBEHANDLINGEN: "NFP: Mangler i saksbehandlingen",
  NAY_MANGLER_VED_BEREGNINGSSKJEMA: "NAY: Mangler ved beregningskjema",
  NFP_MANGLER_VED_BEREGNINGSSKJEMA: "NFP: Mangler ved beregningskjema",
  NAY_MANGELFULL_DOKUMENTASJON: "NAY: Mangelfull dokumentasjon",
  NFP_MANGELFULL_DOKUMENTASJON: "NFP: Mangelfull dokumentasjon",
  NAY_MANGLENDE_DOKUMENTER: "NAY: Manglende dokumenter",
  NFP_MANGLENDE_DOKUMENTER: "NFP: Manglende dokumenter",
  NAY_LANG_LIGGETID_HOS_NAV: "NAY: Lang liggetid hos Nav",
  NFP_LANG_LIGGETID_HOS_NAV: "NFP: Lang liggetid hos Nav",
  NAY_GAMMEL_SAK: "NAY: Gammel sak",
  NFP_GAMMEL_SAK: "NFP: Gammel sak",
  NAV_KONTOR_BRUKER_FEILINFORMERT: "Nav-kontor: Bruker feilinformert",
  NAV_KONTOR_MANGLENDE_INFORMASJON: "Nav-kontor: Manglende informasjon",
  TUNGTVEIENDE_GRUNNER: "Tungtveiende grunner",
  UNDER_BELOPSGRENSEN: "Under beløpsgrensen",
  UNDER_KLAGEBEHANDLING: "Under klagebehandling",
  MANGLER_SUBJEKTIV_SKYLD: "Mangler subjektiv skyld",
};

export function visningsnavn(verdi: string): string {
  return (
    ETIKETTER[verdi] ??
    verdi
      .toLocaleLowerCase("nb-NO")
      .replaceAll("_", " ")
      .replace(/(^|\s)\S/g, (bokstav) => bokstav.toLocaleUpperCase("nb-NO"))
  );
}

export const prosentFormatter = new Intl.NumberFormat("nb-NO", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const beløpFormatter = new Intl.NumberFormat("nb-NO", {
  maximumFractionDigits: 2,
});

const antallFormatter = new Intl.NumberFormat("nb-NO");

/** «1 sak» eller «N saker», med tusenskille. */
export function formaterAntallSaker(antall: number): string {
  return `${antallFormatter.format(antall)} ${antall === 1 ? "sak" : "saker"}`;
}

export function formaterBeløp(verdi: string | number): string {
  if (typeof verdi === "number") {
    return beløpFormatter.format(verdi);
  }

  const normalisert = verdi.replaceAll(/\s/g, "").replace(",", ".");
  const tall = Number(normalisert);
  return normalisert !== "" && Number.isFinite(tall) ? beløpFormatter.format(tall) : verdi;
}
