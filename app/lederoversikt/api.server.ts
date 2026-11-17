import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL, env } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { visningsnavn } from "~/auth/visningsnavn";
import { lederStatistikkResponseSchema, type LederStatistikk } from "./types";

/**
 * Henter lederstatistikk. Uten `enhetId` utleder backend enheten fra innlogget bruker.
 * Med `enhetId` sjekker backend at brukeren leder den valgte enheten.
 */
export async function hentLederStatistikk(
  token: string,
  enhetId?: string | null,
): Promise<LederStatistikk> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for henting av lederstatistikk.");
  }

  const url = new URL(`${BACKEND_API_URL}/api/v1/leder/statistikk`);
  if (enhetId) {
    url.searchParams.set("enhetId", enhetId);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: ["Bearer", token].join(" "),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke hente lederstatistikk fra Watson Admin API", {
      status: response.status,
    });
    throw new Error("Kunne ikke hente lederstatistikk.");
  }

  const resultat = lederStatistikkResponseSchema.safeParse(await response.json());
  if (!resultat.success) {
    logger.error("Schema-validering feilet for lederstatistikk", {
      feil: resultat.error.format(),
    });
    throw new Error("Ugyldig svar fra watson-admin-api (lederstatistikk)");
  }

  if (env.ENVIRONMENT === "dev" || env.ENVIRONMENT === "local-dev") {
    return resultat.data;
  }

  return {
    ...resultat.data,
    ansatte: {
      ...resultat.data.ansatte,
      liste: resultat.data.ansatte.liste.map((ansatt) => ({
        ...ansatt,
        navn: visningsnavn(ansatt.navIdent, ansatt.navn),
      })),
    },
  };
}
