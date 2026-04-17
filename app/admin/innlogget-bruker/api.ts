import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, isDev } from "~/config/env.server";

const brukereSomHarTilgang = {
  hansJacob: "M118946",
  kristofer: "S162301",
  snorri: "E176931",
  sturle: "H139079",
  espen: "E170973",
  // Testbruker vi bruker i dev
  devTestbruker: "Z994531",
  devTestbrukerUtvidet: "Z993399",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });
  if (Object.values(brukereSomHarTilgang).includes(innloggetBruker.navIdent)) {
    if (isDev && env.ENVIRONMENT !== "local-mock") {
      return {
        ...innloggetBruker,
        token: await getBackendOboToken(request),
      };
    }
    return innloggetBruker;
  }
  return Response.json({ error: "Du har ikke tilgang" }, { status: 403 });
}
