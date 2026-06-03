import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentAlleVarsler } from "~/varsler/api.server";
import { hentVarsler as hentVarslerFraMock } from "~/varsler/mock-data.server";

const SIDE_STØRRELSE = 20;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));

  if (skalBrukeMockdata) {
    const alleVarsler = hentVarslerFraMock(request);
    const fraIndeks = (page - 1) * SIDE_STØRRELSE;
    const tilIndeks = fraIndeks + SIDE_STØRRELSE;
    return {
      varsler: alleVarsler.slice(fraIndeks, tilIndeks),
      harFlere: tilIndeks < alleVarsler.length,
      totalItems: alleVarsler.length,
      page,
    };
  }

  const token = await getBackendOboToken(request);
  const resultat = await hentAlleVarsler(token, page, SIDE_STØRRELSE);
  return { ...resultat, page };
}
