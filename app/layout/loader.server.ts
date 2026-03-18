import type { LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, isProd } from "~/config/env.server";
import {
  hentAlleFeatureFlagg,
  hentStatusmeldingFeatureFlagg,
} from "~/feature-toggling/utils.server";
import { parsePreferences, preferencesCookie } from "~/preferanser/PreferencesCookie";
import { parseTheme, themeCookie } from "~/tema/ThemeCookie";

export async function rootLoader({ request }: LoaderFunctionArgs) {
  const user = await hentInnloggetBruker({ request });
  const cookieHeader = request.headers.get("Cookie");
  const [featureFlagg, statusmelding, cookieValue, preferencesCookieValue] = await Promise.all([
    hentAlleFeatureFlagg(user.navIdent),
    hentStatusmeldingFeatureFlagg(),
    themeCookie.parse(cookieHeader),
    preferencesCookie.parse(cookieHeader),
  ]);
  const initialTheme = parseTheme(cookieValue);
  const initialPreferences = parsePreferences(preferencesCookieValue);
  return {
    user,
    initialTheme,
    initialPreferences,
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
