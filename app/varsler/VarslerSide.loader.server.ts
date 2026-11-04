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
    const fraMock = (varsler: typeof alle, ønsketSide: number): Varselside => {
      const resultat = paginerElementer(varsler, ønsketSide, VARSLER_PER_SIDE);
      return {
        varsler: ønsketSide > resultat.totalSider ? [] : resultat.elementer,
        totalItems: varsler.length,
        totalSider: resultat.totalSider,
      };
    };
    uleste = fraMock(
      alle.filter((varsel) => !varsel.erLest),
      ulesteSide,
    );
    leste = fraMock(
      alle.filter((varsel) => varsel.erLest),
      side,
    );
  } else {
    const token = await getBackendOboToken(request);
    [uleste, leste] = await Promise.all([
      hentVarselside(token, "uleste", ulesteSide, VARSLER_PER_SIDE),
      hentVarselside(token, "leste", side, VARSLER_PER_SIDE),
    ]);
  }

  return {
    uleste: { ...uleste, side: ulesteSide, harFlere: ulesteSide < uleste.totalSider },
    leste: { ...leste, side: Math.min(side, leste.totalSider) },
  };
}
