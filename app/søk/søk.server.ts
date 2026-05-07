import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getBeskrivelse, getPersonIdent, getYtelseTyper } from "~/saker/visning";
import { getKategoriText } from "~/saker/selectors";

type Søksak = KontrollsakResponse;

export function søkSaker(request: Request, søketekst: string): Søksak[] {
  const normalisert = søketekst.trim().toLowerCase();
  if (!normalisert) return [];

  const alleSaker: Søksak[] = hentAlleSaker(request);

  return alleSaker.filter((sak) => {
    if (sak.id.toLowerCase().includes(normalisert)) return true;
    if (getSaksreferanse(sak.id).toLowerCase().includes(normalisert)) return true;
    if (getPersonIdent(sak).includes(normalisert)) return true;

    const kategori = getKategoriText(sak);
    if (kategori?.toLowerCase().includes(normalisert)) return true;

    if (getYtelseTyper(sak).some((ytelse) => ytelse.toLowerCase().includes(normalisert)))
      return true;

    const beskrivelse = getBeskrivelse(sak);
    if (beskrivelse?.toLowerCase().includes(normalisert)) return true;

    return false;
  });
}
