/**
 * Sjekklister som vises før en stegovergang. Punktene er plassholdere til fagmiljøet har
 * bestemt innholdet. Avkrysningen er bare en påminnelse og lagres ikke.
 */
export const sjekklister = {
  tilForvaltning: {
    type: "sjekkliste",
    tittel: "Sjekkliste",
    ingress: "Disse handlingene må være fullført før saken kan sendes til forvaltning.",
    beskrivelse:
      "Om ikke alle handlinger er gjort må du lukke modalen, gjøre de nødvendige handlingene og så endre status på nytt.",
    punkter: [
      "Opprettet og journalført kontrollrapporten",
      "Journalført all relevant dokumentasjon",
      "Registrert antatt beløp",
      "Opprettet oppgave til forvaltning",
    ],
  },
} as const;
