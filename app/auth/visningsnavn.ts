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
