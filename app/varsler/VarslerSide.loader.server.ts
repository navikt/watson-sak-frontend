import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { paginerElementer } from "~/utils/paginering";
import { hentVarselside, type Varselside } from "~/varsler/api.server";
import { hentVarsler as hentVarslerFraMock } from "~/varsler/mock-data.server";

/** Varsler-siden viser maks 10 varsler av gangen, både for uleste og leste. */
const VARSLER_PER_SIDE = 10;

function lesSidetall(url: URL, navn: string) {
  const verdi = Number.parseInt(url.searchParams.get(navn) ?? "1", 10);
  return Number.isFinite(verdi) && verdi >= 1 ? verdi : 1;
}

/**
 * Uleste og leste pagineres hver for seg:
 * - `ulesteSide` styrer hvilken side av uleste som hentes. Siden laster dem med «Last flere».
 * - `side` er vanlig paginering av leste og ligger i URL-en.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const ulesteSide = lesSidetall(url, "ulesteSide");
  const side = lesSidetall(url, "side");

  let uleste: Varselside;
  let leste: Varselside;

  if (skalBrukeMockdata) {
    const alle = hentVarslerFraMock(request);
    const ulesteResultat = paginerElementer(
      alle.filter((varsel) => !varsel.erLest),
      ulesteSide,
      VARSLER_PER_SIDE,
    );
    // Uleste lastes med «Last flere», så en side bak slutten skal gi en tom liste.
    uleste = {
      varsler: ulesteSide > ulesteResultat.totalSider ? [] : ulesteResultat.elementer,
      totalItems: alle.filter((varsel) => !varsel.erLest).length,
      totalSider: ulesteResultat.totalSider,
    };
    // Leste har vanlig paginering: `paginerElementer` gir siste side når `side` er for høy.
    const lesteAlle = alle.filter((varsel) => varsel.erLest);
    const lesteResultat = paginerElementer(lesteAlle, side, VARSLER_PER_SIDE);
    leste = {
      varsler: lesteResultat.elementer,
      totalItems: lesteAlle.length,
      totalSider: lesteResultat.totalSider,
    };
  } else {
    const token = await getBackendOboToken(request);
    [uleste, leste] = await Promise.all([
      hentVarselside(token, "uleste", ulesteSide, VARSLER_PER_SIDE),
      hentVarselside(token, "leste", side, VARSLER_PER_SIDE),
    ]);
    // En gammel lenke kan peke på en side som ikke finnes lenger. Hent siste side i stedet
    // for å vise en tom liste uten paginering.
    if (side > leste.totalSider) {
      leste = await hentVarselside(token, "leste", leste.totalSider, VARSLER_PER_SIDE);
    }
  }

  return {
    uleste: { ...uleste, side: ulesteSide, harFlere: ulesteSide < uleste.totalSider },
    leste: { ...leste, side: Math.min(side, leste.totalSider) },
  };
}
