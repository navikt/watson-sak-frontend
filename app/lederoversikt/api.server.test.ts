import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
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
    perStatus: {
      OPPRETTET: 1,
      UTREDES: 0,
      STRAFFERETTSLIG_VURDERING: 0,
      ANMELDT: 0,
      HENLAGT: 0,
    },
    perArbeidsstatus: {
      IKKE_BLOKKERT: 1,
      VENTER_PA_INFORMASJON: 0,
      VENTER_PA_VEDTAK: 0,
      I_BERO: 0,
    },
    antallUfordelte: 1,
  },
  ansatte: {
    tilgjengelig: true,
    liste: [],
    ufordelt: { totaltAntallIkkeAvsluttede: 1, antallOverFrist: 0 },
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
    expect(resultat).toEqual(gyldigRespons);
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
});
