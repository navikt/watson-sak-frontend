/**
 * Returnerer en menneskelig lesbar saksreferanse.
 * Med numeriske IDer fra backend er dette bare tallet som streng.
 */
export function getSaksreferanse(sakId: number | string): string {
  return String(sakId);
}

export function finnSakMedReferanse<T extends { id: number }>(
  saker: T[],
  sakId: string,
): T | undefined {
  return saker.find((s) => String(s.id) === sakId);
}
