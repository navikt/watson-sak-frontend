import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, isProd, skalBrukeMockdata, SPORING_SCRIPT_URL } from "~/config/env.server";
import {
  hentAlleFeatureFlagg,
  hentStatusmeldingFeatureFlagg,
} from "~/feature-toggling/utils.server";
import { logger } from "~/logging/logging";
import { parsePreferences, preferencesCookie } from "~/preferanser/PreferencesCookie";
import { hentKodeverk, type Kodeverk } from "~/saker/api.server";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";

async function hentKodeverkMedFallback(request: Request): Promise<Kodeverk> {
  if (skalBrukeMockdata) return mockKodeverk;
  try {
    const token = await getBackendOboToken(request);
    return await hentKodeverk(token);
  } catch (feil) {
    const feilObjekt = feil instanceof Error ? feil : new Error(String(feil));
    logger.error("Kunne ikke hente kodeverk ved oppstart — bruker tom fallback", {
      feil: feilObjekt,
    });
    return { merker: [], kategorier: [], misbrukstyper: [], ytelseTyper: [], kilder: [] };
  }
}

export async function rootLoader({ request }: LoaderFunctionArgs) {
  const user = await hentInnloggetBruker({ request });
  const cookieHeader = request.headers.get("Cookie");
  const [featureFlagg, statusmelding, preferencesCookieValue, kodeverk] = await Promise.all([
    hentAlleFeatureFlagg(user.navIdent),
    hentStatusmeldingFeatureFlagg(),
    preferencesCookie.parse(cookieHeader),
    hentKodeverkMedFallback(request),
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
