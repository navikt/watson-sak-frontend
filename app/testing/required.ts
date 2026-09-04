/**
 * Henter ut en verdi som må finnes i tester, uten å ty til non-null-assertion (`!`).
 * Kaster en beskrivende feil dersom verdien er `undefined` eller `null`, slik at
 * testfeil peker rett på årsaken (f.eks. mockdata som mangler en forventet sak).
 */
export function required<T>(
  value: T | undefined | null,
  melding = "Forventet en verdi, fikk null/undefined",
): T {
  if (value === undefined || value === null) {
    throw new Error(melding);
  }
  return value;
}
