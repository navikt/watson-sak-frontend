import type { LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";

const brukereSomHarTilgang = {
  hansJacob: "M118946",
  kristofer: "S162301",
  snorri: "E176931",
  sturle: "H139079",
  espen: "E170973",
  // Testbruker vi bruker i dev
  devTestbruker: "Z994531",
};

export async function loader({ request }: LoaderFunctionArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });
  if (Object.values(brukereSomHarTilgang).includes(innloggetBruker.navIdent)) {
    return innloggetBruker;
  }
  return Response.json({ error: "Du har ikke tilgang" }, { status: 403 });
}
