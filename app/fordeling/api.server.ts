import { getBackendOboToken } from "~/auth/access-token";
import { BACKEND_API_URL, skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import type { KontrollsakPageResponse } from "./types.backend";

type HentKontrollsakerArgs = {
  token: string;
  page: number;
  size: number;
};

export async function hentKontrollsaker({
  token,
  page,
  size,
}: HentKontrollsakerArgs): Promise<KontrollsakPageResponse> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for henting av kontrollsaker.");
  }

  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker?page=${page}&size=${size}`, {
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

  return (await response.json()) as KontrollsakPageResponse;
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

  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker/${sakId}/tildel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ saksbehandler }),
  });

  if (!response.ok) {
    logger.error("Kunne ikke tildele kontrollsak i Watson Admin API", {
      status: response.status,
      sakId,
    });
    throw new Error("Kunne ikke tildele kontrollsak.");
  }
}
