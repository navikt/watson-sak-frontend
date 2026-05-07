import { data } from "react-router";

/**
 * Henter et påkrevd tekstfelt fra FormData.
 * Kaster 400-feil hvis feltet mangler eller er tomt.
 */
export function hentTekstfelt(formData: FormData, felt: string, feilmelding: string): string {
  const verdi = formData.get(felt);

  if (typeof verdi !== "string" || verdi.trim().length === 0) {
    throw data(feilmelding, { status: 400 });
  }

  return verdi;
}

/**
 * Henter et valgfritt tekstfelt fra FormData.
 * Returnerer undefined hvis feltet mangler eller er tomt.
 */
export function hentValgfriTekst(formData: FormData, felt: string): string | undefined {
  const verdi = formData.get(felt);

  if (typeof verdi !== "string" || verdi.trim().length === 0) {
    return undefined;
  }

  return verdi;
}
