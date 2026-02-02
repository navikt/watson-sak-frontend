import { startUnleash, type Unleash } from "unleash-client";
import { env, isProd } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { FeatureFlagg } from "./featureflagg";

let unleash: Unleash;
/** Initialiserer Unleash-singletonen */
async function initialiserUnleash() {
  if (unleash) {
    return;
  }
  if (!env.UNLEASH_SERVER_API_TOKEN) {
    throw new Error("UNLEASH_SERVER_API_TOKEN er ikke satt som miljøvariabel.");
  }
  unleash = await startUnleash({
    url: `${env.UNLEASH_SERVER_API_URL}/api`,
    appName: "oppslag-bruker-frontend",
    environment: env.ENVIRONMENT === "prod" ? "production" : "development",
    projectName: env.UNLEASH_SERVER_API_PROJECTS,
    customHeaders: {
      Authorization: env.UNLEASH_SERVER_API_TOKEN,
    },
  });
}

/** Henter alle påskrudde feature-flaggene */
export async function hentAlleFeatureFlagg(
  navIdent: string,
): Promise<Record<FeatureFlagg, boolean>> {
  if (!isProd) {
    logger.info("Returnerer alle feature flaggene som påskrudd");
    // Hvis vi kjører lokalt eller tester, returnerer vi alle feature flaggene som påskrudd
    return Promise.resolve(
      Object.values(FeatureFlagg).reduce(
        (acc, key) => {
          acc[key as FeatureFlagg] = true;
          return acc;
        },
        {} as Record<FeatureFlagg, boolean>,
      ),
    );
  }
  await initialiserUnleash();
  const toggles = unleash.getFeatureToggleDefinitions();
  return toggles
    .filter((toggle) => toggle.name !== FeatureFlagg.STATUSMELDING)
    .reduce(
      (acc, toggle) => {
        acc[toggle.name as FeatureFlagg] = unleash.isEnabled(toggle.name, {
          userId: navIdent,
        });
        return acc;
      },
      {} as Record<FeatureFlagg, boolean>,
    );
}

type Statusmelding = {
  tittel: string;
  beskrivelse?: string;
};
export async function hentStatusmeldingFeatureFlagg(): Promise<
  Statusmelding | false
> {
  if (!isProd) {
    return false;
  }
  await initialiserUnleash();
  const erPåskrudd = unleash.isEnabled(FeatureFlagg.STATUSMELDING);
  if (!erPåskrudd) {
    return false;
  }

  const tekst = unleash.getFeatureToggleDefinition(
    FeatureFlagg.STATUSMELDING,
  )?.description;

  if (!tekst?.trim()) {
    return false;
  }

  const [tittel, ...beskrivelse] = tekst
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!tittel) {
    return false;
  }

  return {
    tittel,
    beskrivelse: beskrivelse.join("\n") || undefined,
  };
}
