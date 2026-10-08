import { z } from "zod";
import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";

const antallSchema = z.number().int().nonnegative();

const mineSakerOppsummeringSchema = z.object({
  nye: antallSchema,
  aktive: antallSchema,
  venter: antallSchema,
  iBero: antallSchema,
});

export type MineSakerOppsummering = z.infer<typeof mineSakerOppsummeringSchema>;

/** Henter antall av innlogget saksbehandlers åpne saker per kategori. Backend utleder identen fra tokenet. */
export async function hentMineSakerOppsummering(token: string): Promise<MineSakerOppsummering> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for henting av oppsummering av egne saker.");
  }

  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker/mine/oppsummering`, {
    headers: {
      Authorization: ["Bearer", token].join(" "),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke hente oppsummering av egne saker fra Watson Admin API", {
      status: response.status,
    });
    throw new Error("Kunne ikke hente oppsummering av egne saker.");
  }

  const resultat = mineSakerOppsummeringSchema.safeParse(await response.json());
  if (!resultat.success) {
    logger.error("Schema-validering feilet for oppsummering av egne saker", {
      feil: resultat.error.format(),
    });
    throw new Error("Ugyldig svar fra watson-admin-api (oppsummering av egne saker)");
  }

  return resultat.data;
}
