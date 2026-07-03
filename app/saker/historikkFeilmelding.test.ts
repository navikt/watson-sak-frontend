import { describe, expect, it, vi } from "vitest";
import { BackendFeilException } from "./api.server";
import { historikkFeilmelding } from "./SakDetaljSide.server";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
  env: { ENVIRONMENT: "local-mock" },
  BACKEND_API_URL: "http://localhost:8080",
}));

describe("historikkFeilmelding", () => {
  it("bruker backendens egen melding for klientrettede feil (under 500)", () => {
    const feil = new BackendFeilException(
      409,
      "Nylig opprettede hendelser kan ikke redigeres eller slettes umiddelbart.",
    );

    expect(historikkFeilmelding(feil)).toBe(
      "Nylig opprettede hendelser kan ikke redigeres eller slettes umiddelbart.",
    );
  });

  it("bruker en generisk melding for serverfeil (500 og oppover), for å unngå å lekke tekniske detaljer", () => {
    const feil = new BackendFeilException(
      500,
      "NullPointerException i BigQueryHendelsesloggImpl.kt:213",
    );

    expect(historikkFeilmelding(feil)).toBe("Kunne ikke lagre historikkinnslaget. Prøv igjen.");
  });

  it("bruker en generisk melding for ukjente/ikke-BackendFeilException-feil", () => {
    expect(historikkFeilmelding(new Error("noe uventet"))).toBe(
      "Kunne ikke lagre historikkinnslaget. Prøv igjen.",
    );
    expect(historikkFeilmelding("streng, ikke et Error-objekt")).toBe(
      "Kunne ikke lagre historikkinnslaget. Prøv igjen.",
    );
  });
});
