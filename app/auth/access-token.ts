import { getToken, requestOboToken, validateToken } from "@navikt/oasis";
import { redirect } from "react-router";
import { env, isDev } from "~/config/env.server";
import { logger } from "~/logging/logging";

/**
 * Returnerer et OBO-token for å kalle backend-APIene
 */
export async function getBackendOboToken(request: Request): Promise<string> {
  return getOboToken({
    request,
    audience: `api://${env.CLUSTER}.holmes.nav-persondata-api/.default`,
  });
}

type GetOboTokenArgs = {
  request: Request;
  audience: string;
};
async function getOboToken({
  request,
  audience,
}: GetOboTokenArgs): Promise<string> {
  if (isDev) {
    if (!env.DEVELOPMENT_OAUTH_TOKEN) {
      throw new Error("Du må sette DEVELOPMENT_OAUTH_TOKEN i .env");
    }
    return Promise.resolve(env.DEVELOPMENT_OAUTH_TOKEN);
  }
  const token = await getValidToken(request);

  const obo = await requestOboToken(token, audience);
  if (!obo.ok) {
    throw redirect(`/oauth2/login`);
  }

  return obo.token;
}

export async function getValidToken(request: Request): Promise<string> {
  if (isDev) {
    if (!env.DEVELOPMENT_OAUTH_TOKEN) {
      throw new Error("Du må sette DEVELOPMENT_OAUTH_TOKEN i .env");
    }
    return Promise.resolve(env.DEVELOPMENT_OAUTH_TOKEN);
  }
  const authHeader = request.headers.get("Authorization");
  if (authHeader == null) {
    throw redirect(`/oauth2/login`);
  }

  const token: string | null | undefined = getToken(authHeader);
  if (!token) {
    if (isDev) {
      logger.error("Du må sette DEVELOPMENT_OAUTH_TOKEN i .env");
      throw new Error("Du må sette DEVELOPMENT_OAUTH_TOKEN i .env");
    }
    throw redirect(`/oauth2/login`);
  }

  const validationResult = await validateToken(token);
  if (!validationResult.ok) {
    if (isDev) {
      logger.error(
        "DEVELOPMENT_OAUTH_TOKEN er ikke gyldig. Generer et nytt token og sett det i .env",
        { error: validationResult.error },
      );
      throw new Error(
        "DEVELOPMENT_OAUTH_TOKEN er ikke gyldig. Generer et nytt token og sett det i .env",
      );
    }
    throw redirect(`/oauth2/login`);
  }

  return token;
}
