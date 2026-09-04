/**
 * Lager for rå filinnhold i mockdata-modus, slik at opplastede bilder kan vises igjen
 * i dokumenteditoren og forhåndsvisningen.
 *
 * Innholdet ligger i minnet med et hardt byte-budsjett og LRU-utkasting, slik at
 * demo-poden ikke vokser ubegrenset uansett hvor mye som lastes opp. Alternativet —
 * å skrive til disk i poden — flytter bare problemet til ephemeral storage og krever
 * samme opprydding, med ekstra I/O på kjøpet.
 */

/** Samlet tak for alt mellomlagret filinnhold på tvers av mock-sesjoner. */
const MAKS_TOTALT_BYTES = 64 * 1024 * 1024;

/** Filer over dette lagres ikke — de er uansett for store til å vises som bilde. */
const MAKS_PER_FIL_BYTES = 12 * 1024 * 1024;

interface Oppføring {
  blob: Blob;
  storrelse: number;
}

// Map bevarer innsettingsrekkefølge, som gir oss LRU-rekkefølgen gratis.
const lager = new Map<string, Oppføring>();
let totaltBytes = 0;

function kastUtTilUnderBudsjett() {
  for (const [filId, oppføring] of lager) {
    if (totaltBytes <= MAKS_TOTALT_BYTES) return;
    lager.delete(filId);
    totaltBytes -= oppføring.storrelse;
  }
}

export function lagreFilInnhold(filId: string, fil: File): void {
  if (fil.size > MAKS_PER_FIL_BYTES) return;

  slettFilInnhold(filId);
  lager.set(filId, {
    blob: fil.slice(0, fil.size, fil.type),
    storrelse: fil.size,
  });
  totaltBytes += fil.size;
  kastUtTilUnderBudsjett();
}

export function hentLagretFilInnhold(filId: string): Blob | undefined {
  const oppføring = lager.get(filId);
  if (!oppføring) return undefined;

  // Flytt bakerst i LRU-rekkefølgen ved bruk.
  lager.delete(filId);
  lager.set(filId, oppføring);
  return oppføring.blob;
}

export function slettFilInnhold(filId: string): void {
  const oppføring = lager.get(filId);
  if (!oppføring) return;
  lager.delete(filId);
  totaltBytes -= oppføring.storrelse;
}

/** Kun for tester. */
export function tømFilInnholdslager(): void {
  lager.clear();
  totaltBytes = 0;
}
