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
