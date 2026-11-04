import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: false,
}));

const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("obo-token"));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
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

const fordelingsSvar = {
  items: [],
  page: 2,
  size: 20,
  totalItems: 21,
  totalPages: 2,
  oppsummering: { antallSaker: 21, eldsteLiggetidDager: 30 },
  valgtOmfang: "enhet:4812",
  enhetNavn: "NAV Kontroll Øst",
  organisasjonsvalg: [{ verdi: "enhet:4812", label: "NAV Kontroll Øst", type: "enhet" }],
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

  it("behandler HTTP 503 som utilgjengelige saksdata", async () => {
    const logger = await import("~/logging/logging");
    const warn = vi.spyOn(logger.logger, "warn");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }),
    );

    const { hentKontrollsaker } = await import("./api.server");

    await expect(
      hentKontrollsaker({ token: "token-123", page: 1, size: 20 }),
    ).rejects.toMatchObject({
      name: "BackendUtilgjengeligError",
    });
    expect(warn).toHaveBeenCalledWith("Watson Admin API kunne ikke hente kontrollsaker", {
      status: 503,
    });
  });

  it("sender ansvarligNavIdent som query-parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, ansvarligNavIdent: "Z999999" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("ansvarligNavIdent=Z999999");
  }, 15000);

  it("sender ansvarlig=MEG og aldersvarsel uten NAV-ident i URL-en", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({
      token: "t",
      page: 2,
      size: 20,
      ansvarlig: "MEG",
      aldersvarsel: "FRA_30_DAGER",
    });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe(
      "https://backend.test/api/v1/kontrollsaker?page=2&size=20&aldersvarsel=FRA_30_DAGER&ansvarlig=MEG",
    );
    expect(url).not.toMatch(/[A-Z]\d{6}/);
    expect(url).not.toContain("NavIdent");
  }, 15000);

  it("sender steg som gjentatte query-parametre", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, steg: ["OPPRETTET", "UTREDES"] });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("steg=OPPRETTET");
    expect(url).toContain("steg=UTREDES");
  }, 15000);

  it("sender status som gjentatte query-parametre", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, status: ["AKTIV"] });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("status=AKTIV");
  }, 15000);

  it("sender utenAnsvarlig=true for fordeling", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 100, utenAnsvarlig: true });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("utenAnsvarlig=true");
  }, 15000);

  it("sender status og statussteg som gjentatte query-parametre", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({
      token: "t",
      page: 1,
      size: 20,
      status: ["VENTER_PA_INFORMASJON", "I_BERO"],
      statusSteg: ["FORVALTNING", "POLITI"],
    });

    const url = fetchMock.mock.calls[0][0] as string;
    const params = new URL(url).searchParams;
    expect(params.getAll("status")).toEqual(["VENTER_PA_INFORMASJON", "I_BERO"]);
    expect(params.getAll("statusSteg")).toEqual(["FORVALTNING", "POLITI"]);
    expect(params.has("arbeidsfilter")).toBe(false);
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

  it("sender utenStatus=true som query-parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, utenStatus: true });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("utenStatus=true");
  }, 15000);

  it("sender sortering som query-parameter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(tomSideSvar);
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsaker } = await import("./api.server");

    await hentKontrollsaker({ token: "t", page: 1, size: 20, sortering: "opprettet,DESC" });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("sortering=opprettet%2CDESC");
  }, 15000);

  it("henter fordelingssaker med filtre, omfang, sortering og side fra URL-en", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fordelingsSvar,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsakerForFordeling } = await import("./api.server");

    const resultat = await hentKontrollsakerForFordeling(
      new Request(
        "http://localhost/fordeling?side=2&omfang=enhet%3A4812&kategori=ARBEID&kategori=SAMLIV&misbrukstype=SVART_ARBEID&merking=PRIORITERT&merking=UTLAND&steg=OPPRETTET&steg=UTREDNING&sorter=saksid&retning=stigende",
      ),
    );

    const url = fetchMock.mock.calls[0][0] as string;
    const params = new URL(url).searchParams;
    expect(url).toContain("/api/v1/kontrollsaker/ufordelte?");
    expect(params.get("page")).toBe("2");
    expect(params.get("size")).toBe("20");
    expect(params.get("omfang")).toBe("enhet:4812");
    expect(params.getAll("kategori")).toEqual(["ARBEID", "SAMLIV"]);
    expect(params.getAll("misbruktype")).toEqual(["SVART_ARBEID"]);
    expect(params.getAll("merking")).toEqual(["PRIORITERT", "UTLAND"]);
    expect(params.getAll("steg")).toEqual(["OPPRETTET", "UTREDNING"]);
    expect(params.get("sortering")).toBe("id,ASC");
    expect(params.has("enhet")).toBe(false);
    expect(params.has("utenAnsvarlig")).toBe(false);
    expect(resultat).toEqual(fordelingsSvar);
  }, 15000);

  it("oversetter misbrukstype-sortering og synkende retning", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fordelingsSvar,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsakerForFordeling } = await import("./api.server");
    await hentKontrollsakerForFordeling(
      new Request("http://localhost/fordeling?sorter=misbrukstype&retning=synkende"),
    );

    const params = new URL(fetchMock.mock.calls[0][0] as string).searchParams;
    expect(params.get("sortering")).toBe("misbruktype,DESC");
  });

  it.each(["side=0", "side=abc", "sorter=ukjent", "retning=sideveis"])(
    "avviser ugyldig fordelingssøk (%s) med 400 uten backend-kall",
    async (søk) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const { hentKontrollsakerForFordeling } = await import("./api.server");
      await expect(
        hentKontrollsakerForFordeling(new Request(`http://localhost/fordeling?${søk}`)),
      ).rejects.toMatchObject({ init: { status: 400 } });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("bevarer backend-avslag for valgt omfang uten å forsøke bredere søk", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);

    const { hentKontrollsakerForFordeling } = await import("./api.server");
    await expect(
      hentKontrollsakerForFordeling(new Request("http://localhost/fordeling?omfang=organisasjon")),
    ).rejects.toMatchObject({ init: { status: 403 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("omfang=organisasjon");
  });

  it("behandler HTTP 503 som utilgjengelige fordelingssaker", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const { hentKontrollsakerForFordeling } = await import("./api.server");
    await expect(
      hentKontrollsakerForFordeling(new Request("http://localhost/fordeling")),
    ).rejects.toMatchObject({ name: "BackendUtilgjengeligError" });
  });

  it("bevarer sesjonsfeil fra backend", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));

    const { hentKontrollsakerForFordeling } = await import("./api.server");
    await expect(
      hentKontrollsakerForFordeling(new Request("http://localhost/fordeling")),
    ).rejects.toMatchObject({ init: { status: 401 } });
  });

  it("avviser schemaavvik uten å logge innholdet i backend-responsen", async () => {
    const logger = await import("~/logging/logging");
    const error = vi.spyOn(logger.logger, "error");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ sensitivResponsverdi: "ikke-logg-meg" }),
      }),
    );

    const { hentKontrollsakerForFordeling } = await import("./api.server");
    await expect(
      hentKontrollsakerForFordeling(new Request("http://localhost/fordeling")),
    ).rejects.toThrow("Ugyldig svar fra watson-admin-api (ufordelte saker)");
    expect(JSON.stringify(error.mock.calls)).not.toContain("ikke-logg-meg");
  });

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
