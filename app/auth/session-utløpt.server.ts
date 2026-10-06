import { data } from "react-router";

/**
 * Kaster en route-feilrespons med statuskode 401 dersom backend-kallet
 * avviste forespørselen på grunn av manglende/utløpt autentisering.
 *
 * Dette skiller en utlogget bruker (behandles av `RootErrorBoundary` med en
 * egen «logg inn på nytt»-side) fra uventede serverfeil, som ellers ville
 * gitt en generisk 500-side når brukeren blir logget ut mens siden er åpen.
 */
export function kastHvisUtlogget(respons: Response): void {
  if (respons.status === 401) {
    throw data("Sesjonen er utløpt. Logg inn på nytt.", { status: 401 });
  }
}

/**
 * Sant når en fanget feil er en utløpt sesjon (401), enten som `Response`
 * eller som `data()`-feil. Brukes i `catch` der andre feil gjøres om til en
 * vennlig feilmelding, men 401 må bevares slik at innloggingssiden vises.
 */
export function erUtloggetFeil(feil: unknown): boolean {
  if (typeof feil !== "object" || feil === null) return false;
  const status =
    (feil as { status?: number }).status ?? (feil as { init?: { status?: number } }).init?.status;
  return status === 401;
}
