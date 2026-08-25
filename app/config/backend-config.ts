export const miljøVerdier = [
  "local-backend",
  "local-dev",
  "local-mock",
  "demo",
  "dev",
  "prod",
] as const;
export type Miljø = (typeof miljøVerdier)[number];

const WATSON_ADMIN_API_DEV_URL = "https://watson-admin-api.intern.dev.nav.no";
const WATSON_SOK_LOCAL_URL = "http://localhost:5173";
const WATSON_SAK_LOCAL_URL = "http://localhost:5174";
const WATSON_SOK_URLER: Record<
  Exclude<Miljø, "local-backend" | "local-dev" | "local-mock">,
  string
> = {
  demo: "https://watson-sok-demo.ekstern.dev.nav.no",
  dev: "https://watson-sok.intern.dev.nav.no",
  prod: "https://watson-sok.intern.nav.no",
};
const WATSON_SAK_URLER: Record<
  Exclude<Miljø, "local-backend" | "local-dev" | "local-mock">,
  string
> = {
  demo: "https://watson-sak-demo.ekstern.dev.nav.no",
  dev: "https://watson-sak.intern.dev.nav.no",
  prod: "https://watson-sak.intern.nav.no",
};

export function skalBrukeMockdataForMiljø(miljø: Miljø) {
  return miljø === "local-mock" || miljø === "demo";
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

export function hentWatsonSokUrl(miljø?: Miljø) {
  if (!miljø) return undefined;
  if (miljø === "local-backend" || miljø === "local-dev" || miljø === "local-mock") {
    return WATSON_SOK_LOCAL_URL;
  }
  return WATSON_SOK_URLER[miljø];
}

export function hentWatsonSakUrl(miljø?: Miljø) {
  if (!miljø) return undefined;
  if (miljø === "local-backend" || miljø === "local-dev" || miljø === "local-mock") {
    return WATSON_SAK_LOCAL_URL;
  }
  return WATSON_SAK_URLER[miljø];
}

export function skalPolleBackendHelse(miljø: Miljø) {
  return miljø === "dev";
}
