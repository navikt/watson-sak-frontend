import { afterEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { ALLE_STEG } from "~/saker/steg";

const { hentKontrollsakerMock } = vi.hoisted(() => ({
  hentKontrollsakerMock: vi.fn(),
}));
const hentSaksbehandlereMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock("~/config/env.server", () => ({
  env: { ENVIRONMENT: "local-mock" },
  skalBrukeMockdata: false,
}));
vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));
vi.mock("~/fordeling/api.server", () => ({
  hentKontrollsaker: hentKontrollsakerMock,
}));
vi.mock("~/saker/api.server", () => ({
  hentSaksbehandlere: hentSaksbehandlereMock,
}));

describe("AlleSakerSide loader", () => {
  afterEach(() => {
    vi.clearAllMocks();
    hentSaksbehandlereMock.mockResolvedValue([]);
  });

  it.each([
    {
      navn: "åpne saker",
      steg: ALLE_STEG,
      status: [],
      forventet: { steg: ALLE_STEG, status: undefined },
    },
    {
      navn: "aktive saker",
      steg: ["UTREDNING", "STRAFFERETTSLIG_VURDERING"],
      status: ["AKTIV"],
      forventet: {
        steg: ["UTREDNING", "STRAFFERETTSLIG_VURDERING"],
        status: ["AKTIV"],
      },
    },
    {
      navn: "ventende saker",
      steg: ALLE_STEG,
      status: ["VENTER_PA_INFORMASJON", "I_BERO"],
      forventet: {
        steg: ALLE_STEG,
        status: ["VENTER_PA_INFORMASJON", "I_BERO"],
      },
    },
    {
      navn: "eldre syntetiske statuser ignoreres",
      steg: [],
      status: ["UTEN_STATUS", "HOS_FORVALTNING", "HOS_POLITI"],
      forventet: { steg: undefined, status: undefined },
    },
    {
      navn: "uten filtre",
      steg: [],
      status: [],
      forventet: { steg: undefined, status: undefined },
    },
  ])(
    "sender vanlige filtre for $navn til backend",
    async ({ steg, status, forventet }) => {
      hentKontrollsakerMock.mockResolvedValue({
        items: [],
        page: 1,
        totalPages: 0,
        totalItems: 0,
      });
      const { loader } = await import("./AlleSakerSide.route");
      const params = new URLSearchParams({ enhet: "ky153k", saksbehandler: "Z123456" });
      steg.forEach((verdi) => params.append("steg", verdi));
      status.forEach((verdi) => params.append("status", verdi));
      await loader({
        request: new Request(`http://localhost/alle-saker?${params}`),
        url: new URL(`http://localhost/alle-saker?${params}`),
        pattern: "/alle-saker",
        params: {},
        context: new RouterContextProvider(),
      });
      expect(hentKontrollsakerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...forventet,
          enhet: ["ky153k"],
          ansvarligNavIdent: "Z123456",
        }),
      );
      expect(hentKontrollsakerMock.mock.calls[0][0]).not.toHaveProperty("arbeidsfilter");
    },
    15000,
  );

  async function kjørLoader(params: URLSearchParams) {
    const { loader } = await import("./AlleSakerSide.route");
    const url = `http://localhost/alle-saker?${params}`;
    return loader({
      request: new Request(url),
      url: new URL(url),
      pattern: "/alle-saker",
      params: {},
      context: new RouterContextProvider(),
    });
  }

  it("sender aldersvarsel og ansvarlig=MEG til backend uten ident", async () => {
    hentKontrollsakerMock.mockResolvedValue({ items: [], page: 1, totalPages: 0, totalItems: 0 });

    await kjørLoader(
      new URLSearchParams({
        aldersvarsel: "NAERMER_SEG_12_MAANEDER",
        ansvarlig: "MEG",
        enhet: "ky153k",
      }),
    );

    const args = hentKontrollsakerMock.mock.calls[0][0];
    expect(args).toMatchObject({
      aldersvarsel: "NAERMER_SEG_12_MAANEDER",
      ansvarlig: "MEG",
      enhet: ["ky153k"],
      ansvarligNavIdent: undefined,
    });
  }, 15000);

  it("returnerer utilgjengelig tilstand uten saksrader ved HTTP 503", async () => {
    const { BackendUtilgjengeligError } = await import("~/utils/backend-utilgjengelig.server");
    hentKontrollsakerMock.mockRejectedValue(new BackendUtilgjengeligError());

    const resultat = await kjørLoader(new URLSearchParams());

    expect(resultat.saksdataUtilgjengelig).toBe(true);
    expect(resultat.rader).toEqual([]);
    expect(resultat.totalAntall).toBe(0);
  });

  it("sender videre sesjonsfeil fra saksbehandleroppslaget selv om kontrollsakkallet gir 503", async () => {
    const { BackendUtilgjengeligError } = await import("~/utils/backend-utilgjengelig.server");
    const sesjonsfeil = new Response(null, { status: 401 });
    hentKontrollsakerMock.mockRejectedValue(new BackendUtilgjengeligError());
    hentSaksbehandlereMock.mockRejectedValue(sesjonsfeil);

    await expect(kjørLoader(new URLSearchParams())).rejects.toBe(sesjonsfeil);
  });

  it("behandler HTTP 503 fra saksbehandleroppslaget som utilgjengelige saksdata", async () => {
    const { BackendFeilException } = await import("~/saker/api-core.server");
    hentKontrollsakerMock.mockResolvedValue({
      items: [],
      page: 1,
      totalPages: 0,
      totalItems: 0,
    });
    hentSaksbehandlereMock.mockRejectedValue(new BackendFeilException(503, "utilgjengelig"));

    const resultat = await kjørLoader(new URLSearchParams());

    expect(resultat.saksdataUtilgjengelig).toBe(true);
    expect(resultat.rader).toEqual([]);
  });

  it.each([
    ["ukjent aldersvarsel", { aldersvarsel: "OVER_30_DAGER" }],
    ["ukjent ansvarlig", { ansvarlig: "Z123456" }],
    ["MEG sammen med saksbehandler", { ansvarlig: "MEG", saksbehandler: "Z123456" }],
  ])(
    "avviser %s med 400",
    async (_navn, params) => {
      await expect(kjørLoader(new URLSearchParams(params))).rejects.toMatchObject({
        init: { status: 400 },
      });
      expect(hentKontrollsakerMock).not.toHaveBeenCalled();
    },
    15000,
  );

  it("avviser to aldersvarsler samtidig med 400", async () => {
    const params = new URLSearchParams();
    params.append("aldersvarsel", "FRA_30_DAGER");
    params.append("aldersvarsel", "NAERMER_SEG_12_MAANEDER");
    await expect(kjørLoader(params)).rejects.toMatchObject({ init: { status: 400 } });
  }, 15000);
});
