import type { LoaderFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, isProd, skalBrukeMockdata, SPORING_SCRIPT_URL } from "~/config/env.server";
import { loggTekniskFeil } from "~/feilhåndtering/teknisk-feil.server";
import { FeatureFlagg } from "~/feature-toggling/featureflagg";
import {
  hentAlleFeatureFlagg,
  hentStatusmeldingFeatureFlagg,
} from "~/feature-toggling/utils.server";
import { logger } from "~/logging/logging";
import { parsePreferences, preferencesCookie } from "~/preferanser/PreferencesCookie";
import { hentKodeverk, type Kodeverk } from "~/saker/api.server";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";

async function hentKodeverkMedFallback(token: string): Promise<Kodeverk> {
  try {
    return await hentKodeverk(token);
  } catch (feil) {
    const feilObjekt = feil instanceof Error ? feil : new Error(String(feil));
    logger.error("Kunne ikke hente kodeverk ved oppstart — bruker tom fallback", {
      feil: feilObjekt,
    });
    return {
      merker: [],
      kategorier: [],
      misbrukstyper: [],
      ytelseTyper: [],
      kilder: [],
      enheter: [],
    };
  }
}

/**
 * Uten Unleash skal appen fortsatt virke. Alle flagg er av, så ny funksjonalitet
 * skjules i stedet for at hele appen viser feilside.
 */
async function medFallback<T>(hent: () => Promise<T>, fallback: T, request: Request): Promise<T> {
  try {
    return await hent();
  } catch (feil) {
    loggTekniskFeil(feil, { kontekst: "hente feature-flagg", request });
    return fallback;
  }
}

const alleFlaggAv = Object.fromEntries(
  Object.values(FeatureFlagg).map((flagg) => [flagg, false]),
) as Record<FeatureFlagg, boolean>;

export async function rootLoader({ request }: LoaderFunctionArgs) {
  const oboToken = skalBrukeMockdata ? null : await getBackendOboToken(request).catch(() => null);
  const user = await hentInnloggetBruker({ request, oboToken });
  const cookieHeader = request.headers.get("Cookie");
  const [featureFlagg, statusmelding, preferencesCookieValue, kodeverk] = await Promise.all([
    medFallback(() => hentAlleFeatureFlagg(user.navIdent), alleFlaggAv, request),
    medFallback(() => hentStatusmeldingFeatureFlagg(), false as const, request),
    preferencesCookie.parse(cookieHeader),
    oboToken ? hentKodeverkMedFallback(oboToken) : Promise.resolve(mockKodeverk),
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
      watsonSokUrl: env.WATSON_SOK_URL ?? null,
    },
    featureFlagg,
    statusmelding,
  };
}
