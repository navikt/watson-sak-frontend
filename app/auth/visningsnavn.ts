/**
 * Overstyrer visningsnavnet til enkelte testbrukere.
 *
 * Brukes i brukertester der testpersonen logger inn med en testbruker, men skal se et
 * fiktivt navn i stedet for navnet som er registrert på NAV-identen.
 */
const OVERSTYRTE_VISNINGSNAVN: Record<string, string> = {
  Z993376: "Petter Saksbehandlersen",
  Z990778: "Kari Ledersen",
};

export function visningsnavn(navIdent: string | null | undefined, navn: string): string;
export function visningsnavn(
  navIdent: string | null | undefined,
  navn: string | null | undefined,
): string | null | undefined;
export function visningsnavn(navIdent: string | null | undefined, navn: string | null | undefined) {
  if (!navIdent) return navn;
  return OVERSTYRTE_VISNINGSNAVN[navIdent.toUpperCase()] ?? navn;
}

/**
 * Registrerte navn på testidentene, slik backend returnerer dem. Brukes der backend
 * sender navnet uten NAV-ident, for eksempel `opprettetAvNavn` i historikken.
 */
const REGISTRERTE_NAVN: Record<string, string> = {
  "TEST Z993376": "Z993376",
  "TEST Z990778": "Z990778",
};

/**
 * Overstyrer et navn som kommer uten NAV-ident. Godtar både det registrerte navnet og
 * den rene identen, siden backend faller tilbake til identen når navnet mangler.
 */
export function visningsnavnFraNavn(navn: string | null | undefined): string | null | undefined {
  if (!navn) return navn;
  const normalisert = navn.trim().toUpperCase();
  const navIdent = REGISTRERTE_NAVN[normalisert] ?? normalisert;
  return OVERSTYRTE_VISNINGSNAVN[navIdent] ?? navn;
}
