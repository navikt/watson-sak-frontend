import type { LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, isProd } from "~/config/env.server";
import {
  hentAlleFeatureFlagg,
  hentStatusmeldingFeatureFlagg,
} from "~/feature-toggling/utils.server";
import { parseTheme, themeCookie } from "~/tema/ThemeCookie";

export async function rootLoader({ request }: LoaderFunctionArgs) {
  const user = await hentInnloggetBruker({ request });
  const [featureFlagg, statusmelding, cookieValue] = await Promise.all([
    hentAlleFeatureFlagg(user.navIdent),
    hentStatusmeldingFeatureFlagg(),
    themeCookie.parse(request.headers.get("Cookie")),
  ]);
  const initialTheme = parseTheme(cookieValue);
  return {
    user,
    initialTheme,
    envs: {
      isProd,
      faroUrl: env.FARO_URL,
      umamiSiteId: env.UMAMI_SITE_ID,
      appversjon: env.APP_VERSION,
      miljø: env.ENVIRONMENT,
    },
    featureFlagg,
    statusmelding,
  };
}
