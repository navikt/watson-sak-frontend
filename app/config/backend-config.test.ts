import { describe, expect, it } from "vitest";
import {
  hentBackendApiUrl,
  hentWatsonSakUrl,
  hentWatsonSokUrl,
  skalBrukeMockdataForMiljø,
  skalPolleBackendHelse,
} from "./backend-config";

describe("backend-config", () => {
  it("bruker mockdata kun for local-mock og demo", () => {
    expect(skalBrukeMockdataForMiljø("local-mock")).toBe(true);
    expect(skalBrukeMockdataForMiljø("demo")).toBe(true);
    expect(skalBrukeMockdataForMiljø("dev")).toBe(false);
    expect(skalBrukeMockdataForMiljø("local-backend")).toBe(false);
  });

  it("bruker lokal backend når appen kjøres i local-backend", () => {
    expect(hentBackendApiUrl("local-backend")).toBe("http://localhost:8080");
  });

  it("bruker Watson Admin API i dev når ingen egen URL er satt", () => {
    expect(hentBackendApiUrl("dev")).toBe("https://watson-admin-api.intern.dev.nav.no");
  });

  it("lar env-variabel overstyre backend-url i dev", () => {
    expect(hentBackendApiUrl("dev", "https://annen-backend.dev.nav.no")).toBe(
      "https://annen-backend.dev.nav.no",
    );
  });

  it("bruker lokale adresser for Watson Søk og Watson Sak", () => {
    expect(hentWatsonSokUrl("local-backend")).toBe("http://localhost:5173");
    expect(hentWatsonSakUrl("local-backend")).toBe("http://localhost:5174");
  });

  it("bruker riktig adresse for Watson Søk og Watson Sak i hvert deploymiljø", () => {
    expect(hentWatsonSokUrl("demo")).toBe("https://watson-sok-demo.ekstern.dev.nav.no");
    expect(hentWatsonSakUrl("demo")).toBe("https://watson-sak-demo.ekstern.dev.nav.no");
    expect(hentWatsonSokUrl("dev")).toBe("https://watson-sok.intern.dev.nav.no");
    expect(hentWatsonSakUrl("dev")).toBe("https://watson-sak.intern.dev.nav.no");
    expect(hentWatsonSokUrl("prod")).toBe("https://watson-sok.intern.nav.no");
    expect(hentWatsonSakUrl("prod")).toBe("https://watson-sak.intern.nav.no");
  });

  it("pollet kun backend-helsen i deployet dev", () => {
    expect(skalPolleBackendHelse("dev")).toBe(true);
    expect(skalPolleBackendHelse("local-mock")).toBe(false);
    expect(skalPolleBackendHelse("local-backend")).toBe(false);
  });
});
