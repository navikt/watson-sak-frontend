/** Valget som lar saksbehandleren skrive en egen dokumentbeskrivelse. */
export const ANNEN_DOKUMENTBESKRIVELSE = "Annet";

/** Faste dokumentbeskrivelser. Den valgte verdien sendes som tittel på journalposten. */
export const dokumentbeskrivelser = [
  "Kontrollrapport - arbeid",
  "Kontrollrapport - utland",
  "Brev - innhenting av kontoopplysninger",
  "Brev - innhenting av timelister",
  "Orienteringsnotat",
  "Anmeldelse",
  ANNEN_DOKUMENTBESKRIVELSE,
] as const;
