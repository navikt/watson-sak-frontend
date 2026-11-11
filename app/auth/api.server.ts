import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { SaksbehandlerInfoSchema, type SaksbehandlerInfo } from "./domene";

const FEILMELDING = "Kunne ikke hente informasjon om innlogget saksbehandler.";

export async function hentSaksbehandlerInfo(token: string): Promise<SaksbehandlerInfo> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_API_URL}/api/innlogget-bruker`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    logger.error("Nettverksfeil ved henting av informasjon om saksbehandler");
    throw new Error(FEILMELDING);
  }

  if (!response.ok) {
    logger.warn("Mottok feil fra innlogget-bruker-API", {
      status: response.status,
    });
    throw new Error(FEILMELDING);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    logger.warn("Respons fra innlogget-bruker-API var ikke gyldig JSON");
    throw new Error(FEILMELDING);
  }

  const parsedData = SaksbehandlerInfoSchema.safeParse(json);
  if (!parsedData.success) {
    logger.warn("Respons fra innlogget-bruker-API var ugyldig");
    throw new Error(FEILMELDING);
  }

  return parsedData.data;
}
