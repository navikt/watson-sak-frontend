import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
}));

vi.mock("~/logging/logging", () => ({
  logger: {
    error: vi.fn(),
  },
}));

const gyldigRespons = { nye: 1, aktive: 2, venter: 3, iBero: 4 };

function stubFetch(respons: { ok: boolean; status: number; body?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: respons.ok,
    status: respons.status,
    json: async () => respons.body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("hentMineSakerOppsummering", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("henter oppsummeringen med bearer-token og uten parametere", async () => {
    const fetchMock = stubFetch({ ok: true, status: 200, body: gyldigRespons });
    const { hentMineSakerOppsummering } = await import("./api.server");

    const resultat = await hentMineSakerOppsummering("token-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/mine/oppsummering",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(resultat).toEqual(gyldigRespons);
  });

  it("avviser ugyldig responskontrakt", async () => {
    stubFetch({ ok: true, status: 200, body: { ...gyldigRespons, iBero: -1 } });
    const { hentMineSakerOppsummering } = await import("./api.server");

    await expect(hentMineSakerOppsummering("token-123")).rejects.toThrow(
      "Ugyldig svar fra watson-admin-api",
    );
  });

  it("kaster en tydelig feil når backend svarer med feil", async () => {
    stubFetch({ ok: false, status: 500 });
    const { hentMineSakerOppsummering } = await import("./api.server");

    await expect(hentMineSakerOppsummering("token-123")).rejects.toThrow(
      "Kunne ikke hente oppsummering av egne saker.",
    );
  });
});
