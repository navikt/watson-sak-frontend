export const miljøVerdier = [
  "local-backend",
  "local-dev",
  "local-mock",
  "demo",
  "dev",
  "prod",
] as const;
type Miljø = (typeof miljøVerdier)[number];

const WATSON_ADMIN_API_DEV_URL = "https://watson-admin-api.intern.dev.nav.no";

export function skalBrukeMockdataForMiljø(miljø: Miljø) {
  return miljø === "local-mock" || miljø === "demo" || miljø === "dev";
}

export function hentBackendApiUrl(miljø: Miljø, watsonAdminApiUrl?: string) {
  if (miljø === "local-backend") {
    return "http://localhost:8080";
  }

  if (miljø === "local-dev" || miljø === "dev") {
    return watsonAdminApiUrl || WATSON_ADMIN_API_DEV_URL;
  }

  return watsonAdminApiUrl || undefined;
}

export function skalPolleBackendHelse(miljø: Miljø) {
  return miljø === "dev";
}
