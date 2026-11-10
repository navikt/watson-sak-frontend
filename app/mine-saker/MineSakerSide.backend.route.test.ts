/**
 * Tester for MineSakerSide loader — backend-sti (skalBrukeMockdata: false).
 * Verifiserer at status-filteret (blokkerende status) oversettes riktig til backend-parametre.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mockHentKontrollsaker = vi.fn();

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: false,
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({
    preferredUsername: "test",
    name: "Saks Behandlersen",
    navIdent: "Z999999",
    enhet: "4812",
  }),
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("~/fordeling/api.server", () => ({
  hentKontrollsaker: mockHentKontrollsaker,
}));

const tomSideResponse = {
  items: [],
  page: 1,
  size: 20,
  totalItems: 0,
  totalPages: 0,
};

function lagKontrollsak(id: number, eierNavIdent: string | null) {
  return {
    id,
    personIdent: "10987654321",
    personNavn: "Test Person",
    saksbehandlere: {
      eier: eierNavIdent
        ? { navIdent: eierNavIdent, navn: "Test Saksbehandler", enhet: "4812" }
        : null,
      deltMed: [],
      opprettetAv: { navIdent: "Z000001", navn: "Test Oppretter", enhet: "4812" },
    },
    steg: "OPPRETTET",
    kategori: "ARBEID",
    kilde: "PUBLIKUM",
    misbruktype: [],
    prioritet: "NORMAL",
    status: null,
    ytelser: [],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
  };
}

describe("MineSakerSide loader — backend-sti", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sender INGEN status som utenStatus=true", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request("http://localhost/mine-saker?status=INGEN"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({
        utenStatus: true,
        status: undefined,
      }),
    );
  }, 15000);

  it("sender blokkerende status uten INGEN som status[]", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request("http://localhost/mine-saker?status=VENTER_PA_INFORMASJON"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({
        utenStatus: undefined,
        status: ["VENTER_PA_INFORMASJON"],
      }),
    );
  }, 15000);

  it("sender begge parametre når INGEN og blokkerende status er valgt", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request("http://localhost/mine-saker?status=INGEN&status=VENTER_PA_INFORMASJON"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({
        utenStatus: true,
        status: ["VENTER_PA_INFORMASJON"],
      }),
    );
  }, 15000);

  it("sender verken utenStatus eller status når status-filter er tomt", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    // Ingen status-param i URL, men steg-param finnes (utløser harFilterParams=true, statusFilter=[])
    await loader({
      request: new Request("http://localhost/mine-saker?steg=OPPRETTET"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({
        utenStatus: undefined,
        status: undefined,
      }),
    );
  }, 15000);

  it("henter Mine saker med ansvarlig=MEG og teller Delt med meg med size=1", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request("http://localhost/mine-saker"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledTimes(2);
    expect(mockHentKontrollsaker).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ ansvarlig: "MEG", page: 1, size: 20 }),
    );
    expect(mockHentKontrollsaker).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        tilknyttet: "MEG",
        utelatEgneSaker: true,
        page: 1,
        size: 1,
      }),
    );
    expect(JSON.stringify(mockHentKontrollsaker.mock.calls)).not.toContain("Z999999");
  }, 15000);

  it("sender steg- og statusfiltre for både Mine og Delt med meg", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request("http://localhost/mine-saker?steg=UTREDNING&status=INGEN"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    const kall = mockHentKontrollsaker.mock.calls.map(([argumenter]) => argumenter);
    expect(kall.find((a) => a.ansvarlig === "MEG")).toEqual(
      expect.objectContaining({ steg: ["UTREDNING"], utenStatus: true }),
    );
    const delt = kall.find((a) => a.tilknyttet === "MEG");
    expect(delt).toEqual(
      expect.objectContaining({
        steg: ["UTREDNING"],
        status: undefined,
        utenStatus: true,
        utelatEgneSaker: true,
      }),
    );
  }, 15000);

  it("henter bare Delt med meg aktivt og bruker sidemetadata fra backend", async () => {
    mockHentKontrollsaker
      .mockResolvedValueOnce({
        items: [lagKontrollsak(42, "Z888888")],
        page: 3,
        size: 20,
        totalItems: 46,
        totalPages: 3,
      })
      .mockResolvedValueOnce({ ...tomSideResponse, size: 1, totalItems: 9, totalPages: 9 });
    const { loader } = await import("./MineSakerSide.route");

    const result = await loader({
      request: new Request(
        "http://localhost/mine-saker?fane=delt&side=3&sorter=status&retning=asc&steg=UTREDES&status=INGEN&status=VENTER_PA_VEDTAK",
      ),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledTimes(2);
    expect(mockHentKontrollsaker).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tilknyttet: "MEG",
        utelatEgneSaker: true,
        page: 3,
        size: 20,
        steg: ["UTREDNING"],
        status: ["VENTER_PA_VEDTAK"],
        utenStatus: true,
        sortering: "status,ASC",
      }),
    );
    expect(mockHentKontrollsaker).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ansvarlig: "MEG",
        page: 1,
        size: 1,
        steg: ["UTREDNING"],
        status: ["VENTER_PA_VEDTAK"],
        utenStatus: true,
        sortering: undefined,
      }),
    );
    expect(result.aktivFane).toBe("delt");
    expect(result.deltMedSaker).toHaveLength(1);
    expect(result.aktivSide).toBe(3);
    expect(result.totalAntall).toBe(46);
    expect(result.totalSider).toBe(3);
    expect(result.antallMineSaker).toBe(9);
    expect(result.antallDelteSaker).toBe(46);
  }, 15000);

  it("sender URL-side og backend-sortering for Mine saker", async () => {
    mockHentKontrollsaker
      .mockResolvedValueOnce({ ...tomSideResponse, page: 2, totalItems: 27, totalPages: 2 })
      .mockResolvedValueOnce({ ...tomSideResponse, size: 1, totalItems: 5, totalPages: 5 });
    const { loader } = await import("./MineSakerSide.route");

    const result = await loader({
      request: new Request("http://localhost/mine-saker?side=2&sorter=saksid&retning=asc"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ page: 2, size: 20, sortering: "id,ASC", ansvarlig: "MEG" }),
    );
    expect(result.aktivSide).toBe(2);
    expect(result.totalAntall).toBe(27);
    expect(result.totalSider).toBe(2);
    expect(result.antallMineSaker).toBe(27);
    expect(result.antallDelteSaker).toBe(5);
  }, 15000);

  it("returnerer utilgjengelig tilstand og ingen saker når tilgangssjekken feiler", async () => {
    const { BackendUtilgjengeligError } = await import("~/utils/backend-utilgjengelig.server");
    mockHentKontrollsaker.mockRejectedValue(new BackendUtilgjengeligError());
    const { loader } = await import("./MineSakerSide.route");

    const result = await loader({
      request: new Request("http://localhost/mine-saker"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(result.saksdataUtilgjengelig).toBe(true);
    expect(result.saker).toEqual([]);
    expect(result.deltMedSaker).toEqual([]);
  });

  it("sender videre sesjonsfeil fra parallelt kall selv om det andre kallet gir 503", async () => {
    const { BackendUtilgjengeligError } = await import("~/utils/backend-utilgjengelig.server");
    const sesjonsfeil = new Response(null, { status: 401 });
    mockHentKontrollsaker
      .mockRejectedValueOnce(new BackendUtilgjengeligError())
      .mockRejectedValueOnce(sesjonsfeil);
    const { loader } = await import("./MineSakerSide.route");

    await expect(
      loader({
        request: new Request("http://localhost/mine-saker"),
        params: {},
        context: {},
      } as Parameters<typeof loader>[0]),
    ).rejects.toBe(sesjonsfeil);
  });

  it("sender filterparametrene for begge faner når Delt med meg er aktiv", async () => {
    mockHentKontrollsaker
      .mockResolvedValueOnce({ ...tomSideResponse, items: [lagKontrollsak(2, "Z888888")] })
      .mockResolvedValueOnce({ ...tomSideResponse, size: 1, totalItems: 1, totalPages: 1 });

    const { loader } = await import("./MineSakerSide.route");

    const result = await loader({
      request: new Request("http://localhost/mine-saker?fane=delt&steg=OPPRETTET&status=INGEN"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        tilknyttet: "MEG",
        utelatEgneSaker: true,
        steg: ["OPPRETTET"],
        utenStatus: true,
      }),
    );
    expect(mockHentKontrollsaker).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        ansvarlig: "MEG",
        steg: ["OPPRETTET"],
        utenStatus: true,
      }),
    );
    expect(result.deltMedSaker.map((sak) => sak.id)).toEqual([2]);
  }, 15000);
});
