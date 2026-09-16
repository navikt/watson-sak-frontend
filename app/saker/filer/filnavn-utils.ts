import { z } from "zod";

export const filnavnSchema = z
  .string()
  .trim()
  .min(1, "Filnavnet kan ikke være tomt")
  .max(200, "Filnavnet kan ikke være lengre enn 200 tegn")
  .refine((navn) => navn !== "." && navn !== "..", "Filnavnet er ugyldig")
  .refine((navn) => !/[\\/\p{Cc}]/u.test(navn), "Filnavnet inneholder ugyldige tegn");

export function splittFilnavn(filnavn: string): { navn: string; endelse: string } {
  const sistePunktum = filnavn.lastIndexOf(".");
  return sistePunktum > 0
    ? { navn: filnavn.slice(0, sistePunktum), endelse: filnavn.slice(sistePunktum) }
    : { navn: filnavn, endelse: "" };
}

export function medNyttFilnavn(opprinneligFilnavn: string, nyttNavn: string): string {
  const navn = filnavnSchema.parse(nyttNavn);
  return navn + splittFilnavn(opprinneligFilnavn).endelse;
}
