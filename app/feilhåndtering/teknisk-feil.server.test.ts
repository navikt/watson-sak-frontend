import { data } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "~/logging/logging";
import { BackendFeilException } from "~/saker/api-core.server";
import {
  erTekniskFeil,
  hentEllerFeil,
  loggTekniskFeil,
  tekniskFeilSvar,
} from "./teknisk-feil.server";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "http://backend",
  skalBrukeMockdata: false,
  env: { ENVIRONMENT: "local-dev" },
}));

afterEach(() => vi.restoreAllMocks());

const request = new Request("https://watson.intern.nav.no/saker/1?fnr=12345678901");

describe("erTekniskFeil", () => {
  it.each([
    ["500 fra backend", new BackendFeilException(500, "x"), true],
    ["503 fra backend", new BackendFeilException(503, "x"), true],
    ["nettverksfeil", new TypeError("fetch failed"), true],
    ["ugyldig svar", new Error("Ugyldig svar fra watson-admin-api"), true],
    ["403 fra backend", new BackendFeilException(403, "x"), false],
    ["409 fra backend", new BackendFeilException(409, "x"), false],
    ["401 som data()", data("Utlogget", { status: 401 }), false],
    ["redirect", new Response(null, { status: 302 }), false],
  ])("%s → %s", (_, feil, forventet) => {
    expect(erTekniskFeil(feil)).toBe(forventet);
  });
});

describe("loggTekniskFeil", () => {
  it("logger feil-ID, status og sti uten melding eller query", () => {
    const error = vi.spyOn(logger, "error").mockImplementation(() => {});

    const feilId = loggTekniskFeil(new BackendFeilException(500, "Fant ikke 12345678901"), {
      kontekst: "hente historikk",
      sakId: 1,
      request,
    });

    expect(feilId).toMatch(/^[0-9a-f]{8}$/);
    const loggdata = JSON.stringify(error.mock.calls);
    expect(loggdata).toContain(feilId);
    expect(loggdata).toContain('"sti":"/saker/1"');
    expect(loggdata).toContain('"status":500');
    expect(loggdata).not.toContain("12345678901");
  });
});

describe("hentEllerFeil", () => {
  it("gir ok med data", async () => {
    await expect(hentEllerFeil(async () => [1], { kontekst: "test" })).resolves.toEqual({
      status: "ok",
      data: [1],
    });
  });

  it("skiller manglende tilgang fra teknisk feil", async () => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
    const ingenTilgang = await hentEllerFeil(
      async () => {
        throw new BackendFeilException(403, "x");
      },
      { kontekst: "test" },
    );
    const feil = await hentEllerFeil(
      async () => {
        throw new BackendFeilException(500, "x");
      },
      { kontekst: "test" },
    );

    expect(ingenTilgang).toEqual({ status: "ingenTilgang" });
    expect(feil).toEqual({ status: "feil", feilId: expect.stringMatching(/^[0-9a-f]{8}$/) });
  });

  it("bruker egne tilgangsstatuser", async () => {
    const utfall = await hentEllerFeil(
      async () => {
        throw new BackendFeilException(404, "x");
      },
      { kontekst: "test", ingenTilgangStatuser: [403, 404] },
    );
    expect(utfall).toEqual({ status: "ingenTilgang" });
  });

  it("kaster kjente feil videre", async () => {
    const utlogget = data("Utlogget", { status: 401 });
    await expect(
      hentEllerFeil(
        async () => {
          throw utlogget;
        },
        { kontekst: "test" },
      ),
    ).rejects.toBe(utlogget);
  });
});

describe("tekniskFeilSvar", () => {
  it("gir 500 med feil-ID og fast tekst", () => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
    const svar = tekniskFeilSvar(new TypeError("fetch failed"), { kontekst: "lagre" });

    expect(svar.init?.status).toBe(500);
    expect(svar.data).toMatchObject({ ok: false, teknisk: true });
    expect(svar.data.feil).not.toContain("fetch failed");
  });

  it("kaster 4xx videre", () => {
    const feil = new BackendFeilException(409, "Konflikt");
    expect(() => tekniskFeilSvar(feil, { kontekst: "lagre" })).toThrow(feil);
  });
});
