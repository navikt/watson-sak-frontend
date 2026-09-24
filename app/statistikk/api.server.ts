import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { statistikkResponseSchema, type Statistikk, type StatistikkSpørring } from "./types";

export async function hentStatistikk(
  token: string,
  spørring: StatistikkSpørring,
): Promise<Statistikk> {
  if (!BACKEND_API_URL) throw new Error("Mangler backend-url for henting av statistikk.");
  const url = new URL(`${BACKEND_API_URL}/api/v1/statistikk`);
  const backendNivaa = {
    meg: "MEG",
    underavdeling: "UNDERAVDELING",
    hovedavdeling: "HOVEDAVDELING",
    "nav-kontroll": "NAV_KONTROLL",
  }[spørring.nivaa];
  url.searchParams.set("nivaa", backendNivaa);
  url.searchParams.set("fra", spørring.fra);
  url.searchParams.set("til", spørring.til);
  if (spørring.enhetId) url.searchParams.set("enhetId", spørring.enhetId);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke hente statistikk fra Watson Admin API", { status: response.status });
    throw new Error("Kunne ikke hente statistikk.");
  }
  const resultat = statistikkResponseSchema.safeParse(await response.json());
  if (!resultat.success) {
    logger.error("Schema-validering feilet for statistikk", { feil: resultat.error.format() });
    throw new Error("Ugyldig svar fra watson-admin-api (statistikk)");
  }
  return resultat.data;
}
