import { afterEach, describe, expect, it, vi } from "vitest";

const mockEnvironment = vi.hoisted(() => ({ value: "prod" }));

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  env: {
    get ENVIRONMENT() {
      return mockEnvironment.value;
    },
  },
}));

vi.mock("~/logging/logging", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const gyldigRespons = {
  enhetId: "hu424t",
  enhetNavn: "Nord",
  enhet: {
    totaltAntallIkkeAvsluttede: 1,
    antallOverFrist: 0,
    perSteg: {
      OPPRETTET: 1,
      UTREDNING: 0,
      FORVALTNING: 0,
      STRAFFERETTSLIG_VURDERING: 0,
      POLITI: 0,
    },
    perStatus: {
      UTEN_STATUS: 1,
      AKTIV: 0,
      VENTER_PA_INFORMASJON: 0,
      VENTER_PA_VEDTAK: 0,
      VENTER_PA_RESULTAT: 0,
      PAAKLAGET: 0,
      I_BERO: 0,
    },
    antallUfordelte: 1,
    oyeblikksbilde: { totalt: 0, nye: 0, aktive: 0, venterPåAndre: 0, ikkeFordelt: 0 },
  },
  ansatte: {
    tilgjengelig: true,
    liste: [],
    ufordelt: {
      totaltAntallIkkeAvsluttede: 1,
      antallOverFrist: 0,
      antallAktive: 0,
      antallAktiveOverFrist: 0,
    },
  },
};

describe("hentLederStatistikk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("henter statistikk uten enhetsparameter og validerer responsen", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => gyldigRespons,
    });
    vi.stubGlobal("fetch", fetchMock);
    const { hentLederStatistikk } = await import("./api.server");

    const resultat = await hentLederStatistikk("token-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/leder/statistikk",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: expect.any(String) }),
      }),
    );
    expect(resultat).toEqual({ ...gyldigRespons, ledetEnheter: [] });
  });

  it("sender valgt enhet som enhetId", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ...gyldigRespons,
        enhetId: "tipsmottak",
        enhetNavn: "Tipsmottak",
        ledetEnheter: [
          { id: "hu424t", navn: "Nord" },
          { id: "tipsmottak", navn: "Tipsmottak" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const { hentLederStatistikk } = await import("./api.server");

    const resultat = await hentLederStatistikk("token-123", "tipsmottak");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/leder/statistikk?enhetId=tipsmottak",
      expect.anything(),
    );
    expect(resultat.ledetEnheter.map((enhet) => enhet.id)).toEqual(["hu424t", "tipsmottak"]);
  });

  it("avviser ugyldig responskontrakt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...gyldigRespons, enhet: { antallOverFrist: -1 } }),
      }),
    );
    const { hentLederStatistikk } = await import("./api.server");

    await expect(hentLederStatistikk("token-123")).rejects.toThrow(
      "Ugyldig svar fra watson-admin-api",
    );
  });

  it.each([
    ["dev", ["Backendnavn Petter", "Backendnavn Kari", "Backendnavn Wenche"]],
    ["prod", ["Petter Øst", "Kari Ledersen Øst", "Wenche Vest"]],
  ] as const)(
    "bruker backendnavn i %s og overstyrer bare kjente identiteter",
    async (environment, expectedNames) => {
      mockEnvironment.value = environment;
      vi.resetModules();
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            ...gyldigRespons,
            ansatte: {
              ...gyldigRespons.ansatte,
              liste: [
                {
                  navn: "Backendnavn Petter",
                  navIdent: "Z993376",
                  totaltAntallIkkeAvsluttede: 0,
                  antallOverFrist: 0,
                  antallAktive: 0,
                  antallAktiveOverFrist: 0,
                },
                {
                  navn: "Backendnavn Kari",
                  navIdent: "Z990778",
                  totaltAntallIkkeAvsluttede: 0,
                  antallOverFrist: 0,
                  antallAktive: 0,
                  antallAktiveOverFrist: 0,
                },
                {
                  navn: "Backendnavn Wenche",
                  navIdent: "Z993471",
                  totaltAntallIkkeAvsluttede: 0,
                  antallOverFrist: 0,
                  antallAktive: 0,
                  antallAktiveOverFrist: 0,
                },
                {
                  navn: "Test Z993376",
                  navIdent: "Z123456",
                  totaltAntallIkkeAvsluttede: 0,
                  antallOverFrist: 0,
                  antallAktive: 0,
                  antallAktiveOverFrist: 0,
                },
              ],
            },
          }),
        }),
      );

      try {
        const { hentLederStatistikk } = await import("./api.server");
        const resultat = await hentLederStatistikk("token-123");

        expect(resultat.ansatte.liste.map(({ navn }) => navn)).toEqual([
          ...expectedNames,
          "Test Z993376",
        ]);
      } finally {
        mockEnvironment.value = "prod";
        vi.resetModules();
      }
    },
  );
});
