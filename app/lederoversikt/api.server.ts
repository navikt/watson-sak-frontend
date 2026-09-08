import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { lederStatistikkResponseSchema, type LederStatistikk } from "./types";

/** Henter lederstatistikk for enheten backend utleder fra innlogget bruker. */
export async function hentLederStatistikk(token: string): Promise<LederStatistikk> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for henting av lederstatistikk.");
  }

  const response = await fetch(`${BACKEND_API_URL}/api/v1/leder/statistikk`, {
    headers: {
      Authorization: ["Bearer", token].join(" "),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
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

  return resultat.data;
}
