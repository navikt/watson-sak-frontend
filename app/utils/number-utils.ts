/**
 * Formater desimaltall
 *
 * @param tall - Tallen som skal formateres
 * @param minimumFractionDigits - Minimum antall desimaler (default: 2)
 * @param maximumFractionDigits - Maksimum antall desimaler (default: 2)
 * @returns Formatert desimaltall
 * @throws RangeError hvis minimumFractionDigits > maximumFractionDigits
 */
export function formaterDesimaltall(
  tall: number,
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
): string {
  if (minimumFractionDigits > maximumFractionDigits) {
    throw new RangeError(
      `minimumFractionDigits (${minimumFractionDigits}) kan ikke være større enn maximumFractionDigits (${maximumFractionDigits})`,
    );
  }

  return tall.toLocaleString("nb-NO", {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

/**
 * Formater prosent
 *
 * @param tall - Tallen som skal formateres som prosent (mellom 0 og 100)
 * @returns Formatert prosent
 */
export function formaterProsent(tall: number): string;
export function formaterProsent<T>(tall: T): T;
export function formaterProsent(tall: unknown): unknown {
  if (typeof tall !== "number") {
    return tall;
  }

  return (tall / 100).toLocaleString("nb-NO", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/**
 * Formater beløp
 *
 * @param tall - Tallen som skal formateres
 * @param maximumFractionDigits - Maksimum antall desimaler (default: 2)
 * @returns Formatert beløp
 */
export function formaterBeløp(
  tall: number,
  maximumFractionDigits?: number,
): string;
export function formaterBeløp<T>(tall: T, maximumFractionDigits?: number): T;
export function formaterBeløp(
  tall: unknown,
  maximumFractionDigits = 2,
): unknown {
  if (typeof tall !== "number") {
    return tall;
  }

  return tall.toLocaleString("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits,
  });
}

export function konverterTilTall(verdi: unknown): number | null {
  if (verdi === null || verdi === undefined || verdi === "") {
    return null;
  }

  const tall =
    typeof verdi === "number" ? verdi : Number(String(verdi).replace(",", "."));
  return Number.isFinite(tall) ? tall : null;
}
