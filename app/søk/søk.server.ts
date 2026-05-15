import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getBeskrivelse, getPersonIdent, getYtelseTyper } from "~/saker/visning";
import { getKategoriText } from "~/saker/selectors";

type Søksak = KontrollsakResponse;

export async function søkSaker(request: Request, søketekst: string): Promise<Søksak[]> {
  const normalisert = søketekst.trim().toLowerCase();
  if (!normalisert) return [];

  if (!skalBrukeMockdata) {
    // Søk mot backend — personIdent-basert
    const erPersonIdent = /^\d{11}$/.test(normalisert);
    if (erPersonIdent) {
      const token = await getBackendOboToken(request);
      return backendApi.søkKontrollsaker(token, normalisert);
    }
    // Backend støtter kun søk på personIdent — for andre søkeord, returner tom liste
    return [];
  }

  const alleSaker: Søksak[] = hentAlleSaker(request);

  return alleSaker.filter((sak) => {
    if (String(sak.id).includes(normalisert)) return true;
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
