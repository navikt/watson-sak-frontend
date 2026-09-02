import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env } from "~/config/env.server";

const brukereSomHarTilgang = {
  kristofer: "S162301",
  snorri: "E176931",
  espen: "E170973",
  alem: "B126228",
};

const testbrukereSomHarTilgang = ["Z993376", "Z993741", "Z993471", "Z990474"];

export async function loader({ request }: LoaderFunctionArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });
  const tillatteNavIdenter = [...Object.values(brukereSomHarTilgang), ...testbrukereSomHarTilgang];
  if (tillatteNavIdenter.includes(innloggetBruker.navIdent)) {
    if (env.ENVIRONMENT !== "local-mock") {
      return {
        ...innloggetBruker,
        token: await getBackendOboToken(request),
      };
    }
    return innloggetBruker;
  }
  return Response.json({ error: "Du har ikke tilgang" }, { status: 403 });
}
