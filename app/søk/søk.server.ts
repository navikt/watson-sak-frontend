import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import type { Sak } from "~/saker/typer";

export function søkSaker(søketekst: string): Sak[] {
  const normalisert = søketekst.trim().toLowerCase();
  if (!normalisert) return [];

  const alleSaker = hentAlleSaker();

  return alleSaker.filter((sak) => {
    if (sak.id.toLowerCase().includes(normalisert)) return true;
    if (sak.fødselsnummer.includes(normalisert)) return true;
    if (sak.kategori?.toLowerCase().includes(normalisert)) return true;
    if (sak.tags.some((tag) => tag.toLowerCase().includes(normalisert))) return true;

    return false;
  });
}
