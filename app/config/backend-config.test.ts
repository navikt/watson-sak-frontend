import { describe, expect, it } from "vitest";
import {
  hentBackendApiUrl,
  skalBrukeMockdataForMiljø,
  skalPolleBackendHelse,
} from "./backend-config";

describe("backend-config", () => {
  it("beholder mockdata for lokal utvikling og dev-deploy inntil flere backend-endepunkter er koblet på", () => {
    expect(skalBrukeMockdataForMiljø("local-mock")).toBe(true);
    expect(skalBrukeMockdataForMiljø("demo")).toBe(true);
    expect(skalBrukeMockdataForMiljø("dev")).toBe(true);
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

  it("pollet kun backend-helsen i deployet dev", () => {
    expect(skalPolleBackendHelse("dev")).toBe(true);
    expect(skalPolleBackendHelse("local-mock")).toBe(false);
    expect(skalPolleBackendHelse("local-backend")).toBe(false);
  });
});
