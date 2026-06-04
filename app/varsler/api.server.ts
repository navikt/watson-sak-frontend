import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { tilVarsel, varselPageBackendResponseSchema } from "./typer";
import type { Varsel } from "./typer";

export async function hentUlesteVarsler(token: string): Promise<Varsel[]> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for henting av varsler.");
  }

  const params = new URLSearchParams({ kunUleste: "true", page: "1", size: "50" });
  const response = await fetch(`${BACKEND_API_URL}/api/v1/varsler?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    logger.error("Kunne ikke hente varsler fra Watson Admin API", { status: response.status });
    throw new Error("Kunne ikke hente varsler.");
  }

  const json = await response.json();
  const parsed = varselPageBackendResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.error("Schema-validering feilet for hentUlesteVarsler", {
      feil: parsed.error.format(),
    });
    throw new Error("Ugyldig svar fra watson-admin-api (hentUlesteVarsler)");
  }

  return parsed.data.items.map(tilVarsel).sort((a, b) => b.tidspunkt.localeCompare(a.tidspunkt));
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
