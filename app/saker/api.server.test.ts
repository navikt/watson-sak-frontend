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

describe("søkKontrollsaker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("søker mot riktig URL med page/size og personIdent i body", async () => {
    const tomSide = { items: [], page: 2, size: 20, totalItems: 0, totalPages: 1 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tomSide,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsaker } = await import("./api.server");
    const resultat = await søkKontrollsaker("token-123", "12345678901", 2, 20);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/sok?page=2&size=20",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ personIdent: "12345678901" }),
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(resultat).toEqual(tomSide);
  });

  it("kaster feil ved ikke-ok HTTP-svar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsaker } = await import("./api.server");

    await expect(søkKontrollsaker("token", "12345678901")).rejects.toThrow();
  });
});

describe("søkKontrollsakerOrganisasjon", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("søker mot riktig URL med page/size og organisasjonsnummer i body", async () => {
    const tomSide = { items: [], page: 1, size: 20, totalItems: 0, totalPages: 1 };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => tomSide,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsakerOrganisasjon } = await import("./api.server");
    const resultat = await søkKontrollsakerOrganisasjon("token-123", "123456789");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/sok/organisasjon?page=1&size=20",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ organisasjonsnummer: "123456789" }),
        headers: expect.objectContaining({ Authorization: "Bearer token-123" }),
      }),
    );
    expect(resultat).toEqual(tomSide);
  });

  it("kaster feil ved ikke-ok HTTP-svar", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { søkKontrollsakerOrganisasjon } = await import("./api.server");

    await expect(søkKontrollsakerOrganisasjon("token", "123456789")).rejects.toThrow();
  });
});
