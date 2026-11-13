import { beforeEach, describe, expect, it, vi } from "vitest";
import { formaterMisbrukstype, formaterYtelseType } from "~/saker/visning";
import { hentKontrollsakerForFordeling } from "./api.server";
import { RouteConfig } from "~/routeConfig";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import { lagMockStatistikk } from "~/statistikk/mock.server";
import { erKlarForFordeling } from "./mapper";
import type { Route } from "./+types/FordelingSide.route";
import { loader as routeLoader } from "./FordelingSide.route";
import { BackendUtilgjengeligError } from "~/utils/backend-utilgjengelig.server";
import { BackendFeilException } from "~/saker/api-core.server";

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: true,
}));

const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const tildelKontrollsakMock = vi.hoisted(() => vi.fn());
const hentSaksbehandlereMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const hentInnloggetBrukerMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    preferredUsername: "test",
    name: "Saks Behandlersen",
    navIdent: "Z999999",
    enhet: "NAV Kontroll Øst",
    enhetId: "4812",
  }),
);

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: hentInnloggetBrukerMock,
}));

vi.mock("~/saker/api.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("~/saker/api.server")>()),
  hentSaksbehandlere: hentSaksbehandlereMock,
}));

vi.mock("~/config/env.server", () => ({
  get BACKEND_API_URL() {
    return "https://backend.test";
  },
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));

vi.mock("./api.server", () => ({
  hentKontrollsakerForFordeling: vi.fn(),
  tildelKontrollsak: tildelKontrollsakMock,
}));

describe("FordelingSide action", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    getBackendOboTokenMock.mockResolvedValue("token-123");
    tildelKontrollsakMock.mockReset();
    tildelKontrollsakMock.mockResolvedValue(undefined);
    resetDefaultSession();
    vi.clearAllMocks();
  });

  it("flytter sak ut av Fordeling i mockmiljø når den tildeles", async () => {
    const { action } = await import("./FordelingSide.server");
    const mockKontrollsaker = hentFordelingssaker(state());
    const tildelbarKontrollsakId = mockKontrollsaker.find(
      (sak) => sak.saksbehandlere.eier === null,
    )?.id;

    expect(tildelbarKontrollsakId).toBeDefined();

    if (!tildelbarKontrollsakId) {
      throw new Error("Fant ingen tildelbar kontrollsak i testdata");
    }

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", String(tildelbarKontrollsakId));
    formData.set("navIdent", "Z123456");

    await action({
      request: new Request("http://localhost/fordeling", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(
      hentFordelingssaker(state()).find((sak) => sak.id === tildelbarKontrollsakId)?.steg,
    ).toBe("OPPRETTET");
    expect(
      hentFordelingssaker(state()).find((sak) => sak.id === tildelbarKontrollsakId)?.saksbehandlere
        .eier,
    ).toMatchObject({ navIdent: "Z123456", navn: "Kari Nordmann" });
    expect(tildelKontrollsakMock).not.toHaveBeenCalled();
  });

  it("kaller backend når tildeling skjer uten mockdata", async () => {
    testState.skalBrukeMockdata = false;

    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "101");
    formData.set("navIdent", "Z123456");

    await action({
      request: new Request("http://localhost/fordeling", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(getBackendOboTokenMock).toHaveBeenCalled();
    expect(tildelKontrollsakMock).toHaveBeenCalledWith({
      token: "token-123",
      sakId: "101",
      saksbehandler: "Z123456",
    });
  });

  it("returnerer teknisk feil når backend feiler under tildeling", async () => {
    testState.skalBrukeMockdata = false;
    tildelKontrollsakMock.mockRejectedValue(new BackendFeilException(500, "Intern feil"));

    const { action } = await import("./FordelingSide.server");
    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "101");
    formData.set("navIdent", "Z123456");

    const resultat = await action({
      request: new Request(`http://localhost${RouteConfig.FORDELING}`, {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(resultat).toMatchObject({
      init: { status: 500 },
      data: {
        teknisk: true,
        feilId: expect.stringMatching(/^[0-9a-f]{8}$/),
      },
    });
  });

  it("feiler med 400 når handling er ukjent", async () => {
    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "ukjent");

    await expect(
      action({
        request: new Request(`http://localhost${RouteConfig.FORDELING}`, {
          method: "POST",
          body: formData,
        }),
        params: {},
        context: {},
      } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("feiler med 404 når sak ikke finnes i mockmiljø", async () => {
    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "999");
    formData.set("navIdent", "Z123456");

    await expect(
      action({
        request: new Request(`http://localhost${RouteConfig.FORDELING}`, {
          method: "POST",
          body: formData,
        }),
        params: {},
        context: {},
      } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 404 } });
  });

  it("feiler med 400 når sakId eller navIdent bare er whitespace", async () => {
    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "   ");
    formData.set("navIdent", " ");

    await expect(
      action({
        request: new Request(`http://localhost${RouteConfig.FORDELING}`, {
          method: "POST",
          body: formData,
        }),
        params: {},
        context: {},
      } as Route.ActionArgs),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });
});

describe("FordelingSide loader", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    resetDefaultSession();
    vi.clearAllMocks();
  });

  it("viser innlogget enhets mockdata og valgmønster fra statistikk", async () => {
    const { loader } = await import("./FordelingSide.server");
    const request = new Request(`http://localhost${RouteConfig.FORDELING}?omfang=organisasjon`);
    const bruker = {
      preferredUsername: "test",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "NAV Kontroll Øst",
      enhetId: "4812",
      erLeder: true,
    };
    hentInnloggetBrukerMock.mockResolvedValueOnce(bruker);

    const resultat = await loader({
      request,
      params: {},
      context: {},
    } as Route.LoaderArgs);

    const mockKontrollsaker = hentFordelingssaker(state()).filter(erKlarForFordeling);
    const statistikk = lagMockStatistikk(
      { nivaa: "underavdeling", fra: "2026-01-01", til: "2026-12-31" },
      bruker.enhet,
      bruker.enhetId,
      { saker: mockKontrollsaker, navIdent: bruker.navIdent },
    );
    const førsteMockSak = hentFordelingssaker(state()).find(
      (sak) => String(sak.id) === String(resultat.saker[0]?.id),
    );
    const forventedeValg = statistikk.organisasjonsvalg
      .filter((valg) => valg.verdi !== "meg")
      .map((valg) => (valg.verdi === "enhet:4812" ? { ...valg, label: bruker.enhet } : valg));

    expect(resultat.enhet).toBe("hele organisasjonen");
    expect(resultat.valgtOmfang).toBe("organisasjon");
    expect(resultat.organisasjonsvalg).toEqual(forventedeValg);
    expect(resultat.saker.length).toBe(mockKontrollsaker.length);
    expect(resultat.saker.every((sak) => sak.stegKode !== "AVSLUTTET")).toBe(true);
    expect(førsteMockSak).toBeDefined();
    expect(resultat.saker[0]).toMatchObject({
      navn: førsteMockSak?.personNavn ?? null,
      opprettetDato: førsteMockSak?.opprettet.slice(0, 10),
      oppdatertDato: (førsteMockSak?.oppdatert ?? førsteMockSak?.opprettet)?.slice(0, 10),
      misbrukstyper: førsteMockSak?.misbruktype.map(formaterMisbrukstype),
      ytelser: førsteMockSak?.ytelser.map((ytelse) => formaterYtelseType(ytelse.type)),
    });
  });

  it.each(["1e1", "0x2", "  ", "0"])("avviser sideverdien %j med 400 i mockmodus", async (side) => {
    const { loader } = await import("./FordelingSide.server");
    const url = new URL("http://localhost/fordeling");
    url.searchParams.set("side", side);

    await expect(
      loader({ request: new Request(url), params: {}, context: {} } as Route.LoaderArgs),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("avviser AVSLUTTET-steg med 400 i mockmodus", async () => {
    const { loader } = await import("./FordelingSide.server");

    await expect(
      loader({
        request: new Request("http://localhost/fordeling?steg=AVSLUTTET"),
        params: {},
        context: {},
      } as Route.LoaderArgs),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("bevarer backend-avslag for AVSLUTTET-steg med 400", async () => {
    testState.skalBrukeMockdata = false;
    vi.mocked(hentKontrollsakerForFordeling).mockRejectedValue({ init: { status: 400 } });
    const { loader } = await import("./FordelingSide.server");
    const request = new Request("http://localhost/fordeling?steg=AVSLUTTET");

    await expect(
      loader({ request, params: {}, context: {} } as Route.LoaderArgs),
    ).rejects.toMatchObject({ init: { status: 400 } });
    expect(hentKontrollsakerForFordeling).toHaveBeenCalledWith(request);
  });

  it("sender bare forespørselen til fordelings-API-et og mapper backend-metadata", async () => {
    testState.skalBrukeMockdata = false;
    const { hentKontrollsakerForFordeling } = await import("./api.server");
    vi.mocked(hentKontrollsakerForFordeling).mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      oppsummering: { antallSaker: 0, eldsteLiggetidDager: 0 },
      valgtOmfang: "enhet:4812",
      enhetNavn: "NAV Kontroll Øst",
      organisasjonsvalg: [{ verdi: "enhet:4812", label: "NAV Kontroll Øst", type: "enhet" }],
    });

    const { loader } = await import("./FordelingSide.server");
    const resultat = await loader({
      request: new Request("http://localhost/fordeling?omfang=enhet%3A4812&side=1"),
      params: {},
      context: {},
    } as Route.LoaderArgs);

    expect(hentKontrollsakerForFordeling).toHaveBeenCalledWith(expect.any(Request));
    expect(resultat.enhet).toBe("NAV Kontroll Øst");
    expect(resultat.valgtOmfang).toBe("enhet:4812");
    expect(resultat.oppsummering).toEqual({ antallSaker: 0, eldsteLiggetidDager: 0 });
    expect(resultat.paginering).toEqual({ side: 1, totalSider: 0, totalAntall: 0 });
  });

  it("henter ikke saksbehandlerlisten for lesebruker", async () => {
    testState.skalBrukeMockdata = false;
    hentInnloggetBrukerMock.mockResolvedValueOnce({
      preferredUsername: "test",
      name: "Lesebruker",
      navIdent: "Z123456",
      enhet: "Øst",
      enhetId: "ky153k",
      erLeder: false,
      erLesebruker: true,
    });
    vi.mocked(hentKontrollsakerForFordeling).mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      totalItems: 0,
      totalPages: 0,
      oppsummering: { antallSaker: 0, eldsteLiggetidDager: 0 },
      valgtOmfang: "organisasjon",
      enhetNavn: "hele organisasjonen",
      organisasjonsvalg: [],
    });

    const resultat = await routeLoader({
      request: new Request("http://localhost/fordeling"),
      params: {},
      context: {},
    } as Route.LoaderArgs);

    expect(hentSaksbehandlereMock).not.toHaveBeenCalled();
    expect(resultat.saksbehandlere).toEqual([]);
    expect(resultat.erLesebruker).toBe(true);
  });

  it("returnerer alle elementene backend leverer uten lokal filtrering eller paginering", async () => {
    testState.skalBrukeMockdata = false;
    const kontrollsaker = hentFordelingssaker(state()).slice(0, 2);
    kontrollsaker[0].saksbehandlere.eier = null;
    kontrollsaker[0].steg = "OPPRETTET";
    kontrollsaker[1].saksbehandlere.eier = {
      navIdent: "Z123456",
      navn: "Kari Nordmann",
      enhet: "NAV Kontroll Øst",
    };
    kontrollsaker[1].steg = "AVSLUTTET";
    vi.mocked(hentKontrollsakerForFordeling).mockResolvedValue({
      items: kontrollsaker,
      page: 2,
      size: 20,
      totalItems: 45,
      totalPages: 3,
      oppsummering: { antallSaker: 45, eldsteLiggetidDager: 58 },
      valgtOmfang: "enhet:4812",
      enhetNavn: "NAV Kontroll Øst",
      organisasjonsvalg: [{ verdi: "enhet:4812", label: "NAV Kontroll Øst", type: "enhet" }],
    });

    const { loader } = await import("./FordelingSide.server");
    const resultat = await loader({
      request: new Request("http://localhost/fordeling?side=2"),
      params: {},
      context: {},
    } as Route.LoaderArgs);

    expect(resultat.saker.map((sak) => sak.id)).toEqual(kontrollsaker.map((sak) => sak.id));
    expect(resultat.saker.map((sak) => sak.stegKode)).toContain("AVSLUTTET");
    expect(resultat.paginering).toEqual({ side: 2, totalSider: 3, totalAntall: 45 });
    expect(resultat.oppsummering).toEqual({ antallSaker: 45, eldsteLiggetidDager: 58 });
  });

  it("redirecter side utenfor intervallet til siste side og bevarer andre parametre", async () => {
    testState.skalBrukeMockdata = false;
    vi.mocked(hentKontrollsakerForFordeling).mockResolvedValue({
      items: [],
      page: 4,
      size: 20,
      totalItems: 41,
      totalPages: 3,
      oppsummering: { antallSaker: 41, eldsteLiggetidDager: 7 },
      valgtOmfang: "enhet:4812",
      enhetNavn: "NAV Kontroll Øst",
      organisasjonsvalg: [{ verdi: "enhet:4812", label: "NAV Kontroll Øst", type: "enhet" }],
    });

    const { loader } = await import("./FordelingSide.server");
    const redirectResponse = await loader({
      request: new Request(
        "http://localhost/fordeling?side=4&omfang=enhet%3A4812&kategori=ARBEID&sorter=saksid&retning=stigende",
      ),
      params: {},
      context: {},
    } as Route.LoaderArgs).catch((feil: unknown) => feil);

    expect(redirectResponse).toBeInstanceOf(Response);
    const response = redirectResponse as Response;
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("Location") ?? "", "http://localhost");
    expect(location.pathname).toBe("/fordeling");
    expect(location.searchParams.get("side")).toBe("3");
    expect(location.searchParams.get("omfang")).toBe("enhet:4812");
    expect(location.searchParams.get("kategori")).toBe("ARBEID");
    expect(location.searchParams.get("sorter")).toBe("saksid");
    expect(location.searchParams.get("retning")).toBe("stigende");
  });

  it("returnerer utilgjengelig tilstand og ingen saker når tilgangssjekken feiler", async () => {
    testState.skalBrukeMockdata = false;
    vi.mocked(hentKontrollsakerForFordeling).mockRejectedValue(new BackendUtilgjengeligError());

    const resultat = await routeLoader({
      request: new Request("http://localhost/fordeling"),
      params: {},
      context: {},
    } as Route.LoaderArgs);

    expect("saksdataUtilgjengelig" in resultat && resultat.saksdataUtilgjengelig).toBe(true);
    expect(resultat.saker).toEqual([]);
  });

  it("bevarer backend-avslag for valgt omfang", async () => {
    testState.skalBrukeMockdata = false;
    vi.mocked(hentKontrollsakerForFordeling).mockRejectedValue({
      init: { status: 403 },
    });

    const { loader } = await import("./FordelingSide.server");

    await expect(
      loader({
        request: new Request("http://localhost/fordeling?omfang=organisasjon"),
        params: {},
        context: {},
      } as Route.LoaderArgs),
    ).rejects.toMatchObject({ init: { status: 403 } });
    expect(hentKontrollsakerForFordeling).toHaveBeenCalledTimes(1);
  });
});
