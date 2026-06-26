import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: false,
}));

describe("hentMerkinger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("henter merkinger fra kodeverk-endepunktet", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        merker: ["PRIORITERT", "HASTEBEHANDLING"],
        kategorier: [],
        misbrukstyper: [],
        ytelseTyper: [],
        kilder: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentMerkinger } = await import("./api.server");
    const resultat = await hentMerkinger("token-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kodeverk",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(resultat).toEqual(["PRIORITERT", "HASTEBEHANDLING"]);
  }, 15000);

  it("returnerer tom liste når ingen merker finnes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ merker: [], kategorier: [], misbrukstyper: [], ytelseTyper: [], kilder: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentMerkinger } = await import("./api.server");
    const resultat = await hentMerkinger("token");

    expect(resultat).toEqual([]);
  }, 15000);
});
