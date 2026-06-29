import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: false,
}));

const tomSideSvar = {
  ok: true,
  status: 200,
  json: async () => ({
    items: [],
    page: 1,
    size: 20,
    totalItems: 0,
    totalPages: 0,
  }),
};

describe("Fordeling api.server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("henter kontrollsaker fra backend med bearer-token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
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

  it("sender ansvarligNavIdent som query-parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, ansvarligNavIdent: "Z999999" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("ansvarligNavIdent=Z999999");
  }, 15000);

  it("sender status som gjentatte query-parametre", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, status: ["OPPRETTET", "UTREDES"] });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("status=OPPRETTET");
    expect(url).toContain("status=UTREDES");
  }, 15000);

  it("sender utenAnsvarlig=true for fordeling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 100, utenAnsvarlig: true });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("utenAnsvarlig=true");
  }, 15000);

  it("sender kategori, misbruktype og merking som gjentatte query-parametre", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({
      token: "t",
      page: 1,
      size: 20,
      kategori: ["ARBEID", "SAMLIV"],
      misbruktype: ["SVART_ARBEID"],
      merking: ["PRIORITERT"],
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("kategori=ARBEID");
    expect(url).toContain("kategori=SAMLIV");
    expect(url).toContain("misbruktype=SVART_ARBEID");
    expect(url).toContain("merking=PRIORITERT");
  }, 15000);

  it("sender utenBlokkering=true som query-parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, utenBlokkering: true });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("utenBlokkering=true");
  }, 15000);

  it("sender sortering som query-parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, sortering: "opprettet,DESC" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("sortering=opprettet%2CDESC");
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
      saksbehandler: "Z123456",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/sak-1/saksbehandler",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ aksjon: "TILDEL", navIdent: "Z123456" }),
      },
    );
  }, 15000);
});
