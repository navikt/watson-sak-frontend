import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { tilVarsel, varselPageBackendResponseSchema } from "./typer";
import type { Varsel } from "./typer";

async function fetchVarslerPage(token: string, params: URLSearchParams, kontekst: string) {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for henting av varsler.");
  }

  const response = await fetch(`${BACKEND_API_URL}/api/v1/varsler?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    logger.error(`Kunne ikke hente varsler (${kontekst})`, { status: response.status });
    throw new Error("Kunne ikke hente varsler.");
  }

  const json = await response.json();
  const parsed = varselPageBackendResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.error(`Schema-validering feilet (${kontekst})`, { feil: parsed.error.format() });
    throw new Error(`Ugyldig svar fra watson-admin-api (${kontekst})`);
  }

  return parsed.data;
}

export async function hentUlesteVarsler(token: string): Promise<Varsel[]> {
  const params = new URLSearchParams({ kunUleste: "true", page: "1", size: "50" });
  const data = await fetchVarslerPage(token, params, "hentUlesteVarsler");
  return data.items.map(tilVarsel).sort((a, b) => b.tidspunkt.localeCompare(a.tidspunkt));
}

export interface VarslerPage {
  varsler: Varsel[];
  harFlere: boolean;
  totalItems: number;
}

export async function hentAlleVarsler(
  token: string,
  page: number,
  size: number,
): Promise<VarslerPage> {
  const params = new URLSearchParams({
    kunUleste: "false",
    page: String(page),
    size: String(size),
  });
  const data = await fetchVarslerPage(token, params, "hentAlleVarsler");

  const varsler = data.items.map(tilVarsel).sort((a, b) => b.tidspunkt.localeCompare(a.tidspunkt));

  return {
    varsler,
    harFlere: page < data.totalPages,
    totalItems: data.totalItems,
  };
}

export async function markerVarselSomLest(token: string, varselId: string): Promise<void> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for å markere varsel som lest.");
  }

  const response = await fetch(`${BACKEND_API_URL}/api/v1/varsler/${varselId}/lest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    logger.warn("Varsel ikke funnet ved markering som lest", { varselId });
    return;
  }

  if (!response.ok) {
    logger.error("Kunne ikke markere varsel som lest", { status: response.status, varselId });
    throw new Error("Kunne ikke markere varsel som lest.");
  }
}
