import { parseAzureUserToken } from "@navikt/oasis";
import { redirect } from "react-router";
import { skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { getBackendOboToken, getValidToken } from "./access-token";
import { hentSaksbehandlerInfo } from "./api.server";

interface InnloggetBruker {
  preferredUsername: string;
  name: string;
  navIdent: string;
  token: string;
  organisasjoner: string;
}

type HentInnloggetBrukerArgs = {
  request: Request;
};
/**
 * Returnerer den innloggede brukeren, eller redirecter brukeren til innlogging
 */
export async function hentInnloggetBruker({
  request,
}: HentInnloggetBrukerArgs): Promise<InnloggetBruker> {
  if (skalBrukeMockdata) {
    return {
      preferredUsername: "test",
      name: "Saks Behandlersen",
      navIdent: "S133337",
      token: "test",
      organisasjoner: "Ukjent",
    };
  }
  const token = await getValidToken(request);

  const parseResult = parseAzureUserToken(token);
  if (!parseResult.ok) {
    logger.error("Token parse resultat ikke ok", { error: parseResult.error });
    throw redirect(`/oauth2/login`);
  }

  const oboToken = await getBackendOboToken(request);

  const saksbehandlerInfo = await hentSaksbehandlerInfo(oboToken);

  return {
    preferredUsername: parseResult.preferred_username,
    name: parseResult.name,
    navIdent: parseResult.NAVident,
    token: oboToken,
    organisasjoner: saksbehandlerInfo.organisasjoner?.join(", ") || "Ukjent",
  };
}
