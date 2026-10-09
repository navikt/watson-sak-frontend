/** Felles antall rader per side i alle lister (saker, søk, varsler). */
export const ANTALL_PER_SIDE = 20;

export function paginerElementer<T>(elementer: T[], ønsketSide: number, sideStørrelse: number) {
  const totalSider = Math.max(1, Math.ceil(elementer.length / sideStørrelse));
  const aktivSide = Math.min(Math.max(ønsketSide, 1), totalSider);
  const startIndex = (aktivSide - 1) * sideStørrelse;

  return {
    aktivSide,
    totalSider,
    elementer: elementer.slice(startIndex, startIndex + sideStørrelse),
  };
}
