import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentStatistikk } from "./api.server";
import { lagMockStatistikk } from "./mock.server";
import type { StatistikkSpørring } from "./types";

const ISO_DATO = /^\d{4}-\d{2}-\d{2}$/;
const gyldigDato = (verdi: string | null) => (verdi && ISO_DATO.test(verdi) ? verdi : null);

function lagStandardPeriode() {
  const nå = new Date();
  const iso = (dato: Date) => dato.toISOString().slice(0, 10);
  return {
    fra: iso(new Date(nå.getFullYear(), nå.getMonth(), 1)),
    til: iso(new Date(nå.getFullYear(), nå.getMonth() + 1, 0)),
  };
}

function lagPeriode(url: URL) {
  const standard = lagStandardPeriode();
  if (url.searchParams.get("periode") === "year") {
    const år = new Date().getFullYear();
    return { fra: `${år}-01-01`, til: `${år}-12-31` };
  }
  return {
    fra: gyldigDato(url.searchParams.get("fra")) ?? standard.fra,
    til: gyldigDato(url.searchParams.get("til")) ?? standard.til,
  };
}

export async function loader({ request }: { request: Request }) {
  const bruker = await hentInnloggetBruker({ request });
  const url = new URL(request.url);
  const periode = lagPeriode(url);
  const spørring: StatistikkSpørring = {
    omfang: url.searchParams.get("omfang") || (bruker.enhetId ? `enhet:${bruker.enhetId}` : "meg"),
    fra: periode.fra,
    til: periode.til,
  };
  const data = skalBrukeMockdata
    ? lagMockStatistikk(spørring, bruker.enhet, bruker.enhetId)
    : await hentStatistikk(await getBackendOboToken(request), spørring);
  return { data, spørring, bruker };
}
