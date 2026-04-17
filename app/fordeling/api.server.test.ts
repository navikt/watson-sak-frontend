import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: false,
}));

describe("Fordeling api.server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("henter kontrollsaker fra backend med bearer-token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [],
        page: 1,
        size: 100,
        totalItems: 0,
        totalPages: 0,
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "token-123", page: 1, size: 100 });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker?page=1&size=100",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token-123",
          Accept: "application/json",
        },
      },
    );
  }, 15000);

  it("sender tildeling til backend med saksbehandler", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { tildelKontrollsak } = await import("./api.server");

    await tildelKontrollsak({
      token: "token-123",
      sakId: "sak-1",
      saksbehandler: "Kari Nordmann",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/sak-1/tildel",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ saksbehandler: "Kari Nordmann" }),
      },
    );
  }, 15000);
});
