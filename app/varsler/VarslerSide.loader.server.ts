import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentAlleVarsler, hentAntallUleste } from "~/varsler/api.server";
import { ANTALL_PER_SIDE as SIDE_STØRRELSE } from "~/utils/paginering";
import { hentVarsler as hentVarslerFraMock } from "~/varsler/mock-data.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const rawPage = parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  if (skalBrukeMockdata) {
    const alleVarsler = hentVarslerFraMock(request);
    const fraIndeks = (page - 1) * SIDE_STØRRELSE;
    const tilIndeks = fraIndeks + SIDE_STØRRELSE;
    const antallUleste = alleVarsler.filter((varsel) => !varsel.erLest).length;
    return {
      varsler: alleVarsler.slice(fraIndeks, tilIndeks),
      harFlere: tilIndeks < alleVarsler.length,
      totalItems: alleVarsler.length,
      antallUleste,
      antallLeste: alleVarsler.length - antallUleste,
      page,
    };
  }

  const token = await getBackendOboToken(request);
  const [resultat, antallUleste] = await Promise.all([
    hentAlleVarsler(token, page, SIDE_STØRRELSE),
    hentAntallUleste(token),
  ]);
  return {
    ...resultat,
    antallUleste,
    antallLeste: Math.max(resultat.totalItems - antallUleste, 0),
    page,
  };
}
