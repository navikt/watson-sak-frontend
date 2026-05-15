import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { SaksbehandlerInfoSchema, type SaksbehandlerInfo } from "./domene";

export async function hentSaksbehandlerInfo(token: string): Promise<SaksbehandlerInfo> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/innlogget-bruker`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      logger.warn("Mottok feil fra innlogget-bruker-API", {
        status: response.status,
      });
      return { navIdent: "", navn: "Ukjent", enhet: null };
    }

    const json = await response.json();
    const parsedData = SaksbehandlerInfoSchema.safeParse(json);
    if (!parsedData.success) {
      logger.warn("Respons fra innlogget-bruker-API var ugyldig", {
        parsingError: parsedData.error,
        data: json,
      });
      return { navIdent: "", navn: "Ukjent", enhet: null };
    }
    return parsedData.data;
  } catch (error) {
    logger.error("Kunne ikke hente informasjon om saksbehandler", { error });
    return { navIdent: "", navn: "Ukjent", enhet: null };
  }
}
