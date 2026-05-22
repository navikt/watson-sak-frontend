import { getBackendOboToken } from "~/auth/access-token";
import { BACKEND_API_URL, skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { kontrollsakPageResponseSchema } from "~/saker/types.backend";
import type { KontrollsakPageResponse } from "./types.backend";

type HentKontrollsakerArgs = {
  token: string;
  page: number;
  size: number;
  ansvarligNavIdent?: string;
};

export async function hentKontrollsaker({
  token,
  page,
  size,
  ansvarligNavIdent,
}: HentKontrollsakerArgs): Promise<KontrollsakPageResponse> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for henting av kontrollsaker.");
  }

  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (ansvarligNavIdent) params.set("ansvarligNavIdent", ansvarligNavIdent);

  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    logger.error("Kunne ikke hente kontrollsaker fra Watson Admin API", {
      status: response.status,
    });
    throw new Error("Kunne ikke hente kontrollsaker.");
  }

  const json = await response.json();
  const parsed = kontrollsakPageResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.error("Schema-validering feilet for hentKontrollsaker", {
      feil: parsed.error.format(),
    });
    throw new Error("Ugyldig svar fra watson-admin-api (hentKontrollsaker)");
  }
  return parsed.data;
}

export async function hentKontrollsakerForFordeling(request: Request) {
  if (skalBrukeMockdata) {
    return null;
  }

  const token = await getBackendOboToken(request);
  return hentKontrollsaker({ token, page: 1, size: 100 });
}

type TildelKontrollsakArgs = {
  token: string;
  sakId: string;
  saksbehandler: string;
};

export async function tildelKontrollsak({
  token,
  sakId,
  saksbehandler,
}: TildelKontrollsakArgs): Promise<void> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for tildeling av kontrollsak.");
  }

  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker/${sakId}/saksbehandler`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ aksjon: "TILDEL", navIdent: saksbehandler }),
  });

  if (!response.ok) {
    logger.error("Kunne ikke tildele kontrollsak i Watson Admin API", {
      status: response.status,
      sakId,
    });
    throw new Error("Kunne ikke tildele kontrollsak.");
  }
}
