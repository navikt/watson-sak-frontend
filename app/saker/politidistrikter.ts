/** Politidistriktene og særorganene en sak kan anmeldes til. */
export const POLITIDISTRIKTER = [
  "Agder politidistrikt",
  "Finnmark politidistrikt",
  "Innlandet politidistrikt",
  "Kripos",
  "Møre og Romsdal politidistrikt",
  "Nordland politidistrikt",
  "Oslo politidistrikt",
  "Sør-Vest politidistrikt",
  "Sør-Øst politidistrikt",
  "Troms politidistrikt",
  "Trøndelag politidistrikt",
  "Vest politidistrikt",
  "Økokrim",
  "Øst politidistrikt",
] as const;

export function erGyldigPolitidistrikt(verdi: string): boolean {
  return (POLITIDISTRIKTER as readonly string[]).includes(verdi);
}
