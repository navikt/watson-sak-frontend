const mockUuidPrefiks = "00000000-0000-4000-8000-";

export function getSaksreferanse(sakId: string): string {
  if (!sakId.startsWith(mockUuidPrefiks)) {
    return sakId;
  }

  const hale = sakId.slice(mockUuidPrefiks.length);
  const verdi = Number.parseInt(hale, 10);

  if (Number.isNaN(verdi)) {
    return sakId;
  }

  const saksnummer = Math.floor((verdi % 1_000_000) / 1_000);

  return saksnummer > 0 ? String(saksnummer) : sakId;
}

export function finnSakMedReferanse<T extends { id: string }>(
  saker: T[],
  sakId: string,
): T | undefined {
  return saker.find((s) => getSaksreferanse(s.id) === sakId);
}
