import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { SaksbehandlerInfoSchema, type SaksbehandlerInfo } from "./domene";

export async function hentSaksbehandlerInfo(
  token: string,
): Promise<SaksbehandlerInfo> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/saksbehandler`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const json = await response.json();
    if (!json.data) {
      logger.warn("Mottok feil fra saksbehandler-API", {
        feilmelding: json.error,
        status: response.status,
      });
      return {
        navIdent: "",
        organisasjoner: ["Ukjent"],
      };
    }
    const parsedData = SaksbehandlerInfoSchema.safeParse(json.data);
    if (!parsedData.success) {
      logger.warn("Informasjon fra saksbehandler-API var ugyldig", {
        feilmelding: json.error,
        status: response.status,
        parsingError: parsedData.error,
        data: json,
      });
      return {
        navIdent: "",
        organisasjoner: ["Ukjent"],
      };
    }
    return parsedData.data;
  } catch (error) {
    logger.error("Kunne ikke hente informasjon om saksbehandler", { error });
    return {
      navIdent: "",
      organisasjoner: ["Ukjent"],
    };
  }
}
