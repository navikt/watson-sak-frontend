/**
 * Formaterer en "YYYY-MM"-streng til "mån. år"
 *
 * @example
 * formaterÅrMåned("2025-01") // "jan. 2025"
 * formaterÅrMåned("2025-02") // "feb. 2025"
 * formaterÅrMåned("2025-03") // "mars 2025"
 */
export function formaterÅrMåned(årMåned: string | null | undefined) {
  if (!årMåned || !årMåned.match(/^\d{4}-\d{2}$/)) {
    return "–";
  }
  try {
    const formaterer = new Intl.DateTimeFormat("nb-NO", {
      month: "long",
      year: "numeric",
    });
    return formaterer.format(new Date(`${årMåned}-01`));
  } catch {
    return årMåned;
  }
}

/**
 * Formaterer en ISO-datostreng (YYYY-MM-DD) til norsk format (d. MMM yyyy)
 *
 * @example
 * formaterDato("2023-01-15") // "15. jan. 2023"
 * formaterDato("2023-12-31") // "31. des. 2023"
 */
export function formaterDato(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    const formaterer = new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return formaterer.format(date);
  } catch {
    return isoDate;
  }
}

export function formaterTilIsoDato(dato: Date): string {
  // Dette returnerer en streng i formatet "YYYY-MM-DD"
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dato);
}

/**
 * Kalkulerer hvor mange hele dater det er mellom to datoer
 *
 * Datoene man sender inn kan være ISO-timestamps, eller datoobjekter.
 *
 * @example
 * ```tsx
 * forskjellIDager("2025-01-01", "2025-01-02") // 1
 * forskjellIDager("2025-01-01", new Date("2025-01-02")) // 1
 * forskjellIDager(new Date("2025-01-01"), "2025-01-02") // 1
 * forskjellIDager(new Date("2025-01-01"), new Date("2025-01-02")) // 1
 * ```
 */
export function forskjellIDager(fom: string | Date, tom: string | Date) {
  const fomDato = new Date(fom);
  const tomDato = new Date(tom);
  return Math.floor(
    Math.abs(fomDato.getTime() - tomDato.getTime()) / (1000 * 60 * 60 * 24),
  );
}
