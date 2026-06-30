import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, isProd, skalBrukeMockdata, SPORING_SCRIPT_URL } from "~/config/env.server";
import {
  hentAlleFeatureFlagg,
  hentStatusmeldingFeatureFlagg,
} from "~/feature-toggling/utils.server";
import { parsePreferences, preferencesCookie } from "~/preferanser/PreferencesCookie";
import { hentKodeverk } from "~/saker/api.server";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";

export async function rootLoader({ request }: LoaderFunctionArgs) {
  const user = await hentInnloggetBruker({ request });
  const cookieHeader = request.headers.get("Cookie");
  const [featureFlagg, statusmelding, preferencesCookieValue, kodeverk] = await Promise.all([
    hentAlleFeatureFlagg(user.navIdent),
    hentStatusmeldingFeatureFlagg(),
    preferencesCookie.parse(cookieHeader),
    skalBrukeMockdata
      ? Promise.resolve(mockKodeverk)
      : getBackendOboToken(request).then(hentKodeverk),
  ]);
  const initialPreferences = parsePreferences(preferencesCookieValue);
  return {
    user,
    kodeverk,
    initialPreferences,
    envs: {
      isProd,
      faroUrl: env.FARO_URL,
      umamiSiteId: env.UMAMI_SITE_ID,
      sporingScriptUrl: SPORING_SCRIPT_URL,
      appversjon: env.APP_VERSION,
      miljø: env.ENVIRONMENT,
    },
    featureFlagg,
    statusmelding,
  };
}
