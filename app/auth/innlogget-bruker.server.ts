import { parseAzureUserToken } from "@navikt/oasis";
import { redirect } from "react-router";
import { env } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { getBackendOboToken, getValidToken } from "./access-token";
import { hentSaksbehandlerInfo } from "./api.server";

interface InnloggetBruker {
  preferredUsername: string;
  name: string;
  navIdent: string;
  enhet: string;
}

type HentInnloggetBrukerArgs = {
  request: Request;
  oboToken?: string | null;
};
/**
 * Returnerer den innloggede brukeren, eller redirecter brukeren til innlogging
 */
export async function hentInnloggetBruker({
  request,
  oboToken,
}: HentInnloggetBrukerArgs): Promise<InnloggetBruker> {
  if (env.ENVIRONMENT === "local-mock") {
    return {
      preferredUsername: "test",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "4812",
    };
  }
  const token = await getValidToken(request);

  const parseResult = parseAzureUserToken(token);
  if (!parseResult.ok) {
    logger.error("Token parse resultat ikke ok", { error: parseResult.error });
    throw redirect(`/oauth2/login`);
  }

  if (env.ENVIRONMENT === "demo") {
    return {
      preferredUsername: parseResult.preferred_username,
      name: parseResult.name,
      navIdent: parseResult.NAVident,
      enhet: "Ukjent",
    };
  }

  const resolvedOboToken = oboToken ?? (await getBackendOboToken(request));

  const saksbehandlerInfo = await hentSaksbehandlerInfo(resolvedOboToken);

  return {
    preferredUsername: parseResult.preferred_username,
    name: parseResult.name,
    navIdent: parseResult.NAVident,
    enhet: saksbehandlerInfo.enhet ?? "Ukjent",
  };
}
