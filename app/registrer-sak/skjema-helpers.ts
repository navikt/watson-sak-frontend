export type YtelseRadVerdier = {
  type?: string;
  fraDato?: string;
  tilDato?: string;
  beløp?: string;
};

function lesString(formData: FormData, navn: string): string {
  const verdi = formData.get(navn);
  return typeof verdi === "string" ? verdi : "";
}

export function parseYtelseRader(formData: FormData): YtelseRadVerdier[] {
  const indekser = new Set<number>();
  for (const nøkkel of formData.keys()) {
    const treff = nøkkel.match(/^ytelser\[(\d+)\]\.(?:type|fraDato|tilDato|beløp)$/);
    if (treff) {
      indekser.add(Number(treff[1]));
    }
  }

  return Array.from(indekser)
    .sort((a, b) => a - b)
    .map((i) => ({
      type: lesString(formData, `ytelser[${i}].type`) || undefined,
      fraDato: lesString(formData, `ytelser[${i}].fraDato`) || undefined,
      tilDato: lesString(formData, `ytelser[${i}].tilDato`) || undefined,
      beløp: lesString(formData, `ytelser[${i}].beløp`) || undefined,
    }));
}

export function bygFeilkartFraIssues(
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>,
): Record<string, string[]> {
  const kart: Record<string, string[]> = {};
  for (const issue of issues) {
    const nøkkel = issue.path.length === 0 ? "skjema" : issue.path.join(".");
    (kart[nøkkel] ??= []).push(issue.message);
  }
  return kart;
}
