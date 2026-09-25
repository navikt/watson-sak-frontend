const ETIKETTER: Record<string, string> = {
  ANMELDELSE_VURDERES: "Anmeldelse vurderes",
  ANNET: "Annet",
  ARBEID: "Arbeid",
  AVKLART: "Avklart",
  AVSLUTTET: "Avsluttet",
  BEHANDLER: "Behandler",
  DOKUMENTFALSK: "Dokumentfalsk",
  FORVALTNING: "Forvaltning",
  HENLAGT: "Henlagt",
  IDENTITET: "Identitet",
  I_BERO: "I bero",
  OPPRETTET: "Opprettet",
  POLITI: "Politi",
  SAMLIV: "Samliv",
  STRAFFERETTSLIG_VURDERING: "Strafferettslig vurdering",
  TILTAK: "Tiltak",
  UTLAND: "Utland",
  UTREDES: "Utredes",
  VENTER_PA_INFORMASJON: "Venter på informasjon",
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
