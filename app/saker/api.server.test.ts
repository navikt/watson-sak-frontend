import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: false,
}));

describe("hentKodeverk", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("henter kodeverk fra endepunktet og returnerer alle felter", async () => {
    const mockRespons = {
      merker: ["PRIORITERT", "HASTEBEHANDLING"],
      kategorier: [{ kode: "ARBEID", beskrivelse: "Arbeid" }],
      misbrukstyper: [{ kode: "SVART_ARBEID", kategori: "ARBEID", beskrivelse: "Svart arbeid" }],
      ytelseTyper: [{ kode: "DAGPENGER", beskrivelse: "Dagpenger" }],
      kilder: [{ kode: "PUBLIKUM", beskrivelse: "Publikum" }],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockRespons,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentKodeverk } = await import("./api.server");
    const resultat = await hentKodeverk("token-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kodeverk",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(resultat).toEqual(mockRespons);
  }, 15000);

  it("returnerer tomme lister når ingen verdier finnes", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        merker: [],
        kategorier: [],
        misbrukstyper: [],
        ytelseTyper: [],
        kilder: [],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentKodeverk } = await import("./api.server");
    const resultat = await hentKodeverk("token");

    expect(resultat.merker).toEqual([]);
    expect(resultat.kategorier).toEqual([]);
  }, 15000);
});
