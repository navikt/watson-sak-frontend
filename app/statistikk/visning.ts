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
  UTREDES: "Utredes",
  UTREDNING: "Utredning",
  VENTER_PA_INFORMASJON: "Venter på informasjon",
  PAAKLAGET: "Påklaget",
  VENTER_PA_RESULTAT: "Venter på resultat",
  VENTER_PA_VEDTAK: "Venter på vedtak",
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
