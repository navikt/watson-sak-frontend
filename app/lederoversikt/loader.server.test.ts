import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSaksenhet } from "~/saker/selectors";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import type { InnloggetBruker } from "~/auth/innlogget-bruker.server";

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: true,
}));

const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const hentKontrollsakerMock = vi.hoisted(() => vi.fn());
const hentSaksbehandlereMock = vi.hoisted(() => vi.fn());

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));

vi.mock("~/fordeling/api.server", () => ({
  hentKontrollsaker: hentKontrollsakerMock,
}));

vi.mock("~/saker/api.server", () => ({
  hentSaksbehandlere: hentSaksbehandlereMock,
}));

function lederBruker(overstyringer: Partial<InnloggetBruker> = {}): InnloggetBruker {
  return {
    preferredUsername: "leder",
    name: "Leder Ledersen",
    navIdent: "Z888888",
    enhet: "Nord",
    enhetId: "hu424t",
    erLeder: true,
    ...overstyringer,
  };
}

describe("hentLederOversiktData", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    vi.clearAllMocks();
    resetDefaultSession();
  });

  it("returnerer tom liste når leder mangler enhetId", async () => {
    const { hentLederOversiktData } = await import("./loader.server");

    const resultat = await hentLederOversiktData({
      request: new Request("http://localhost"),
      innloggetBruker: lederBruker({ enhetId: null }),
    });

    expect(resultat).toEqual({ saker: [], ansatte: [] });
  });

  it("filtrerer mockdata på lederens enhet", async () => {
    const { hentLederOversiktData } = await import("./loader.server");

    const resultat = await hentLederOversiktData({
      request: new Request("http://localhost"),
      innloggetBruker: lederBruker(),
    });

    expect(resultat.saker.length).toBeGreaterThan(0);
    for (const sak of resultat.saker) {
      expect(getSaksenhet(sak)).toBe("hu424t");
    }

    const forventetAntallAnsatte = mockSaksbehandlerDetaljer.filter(
      (sb) => sb.enhet === "hu424t",
    ).length;
    expect(resultat.ansatte).toHaveLength(forventetAntallAnsatte);
    expect(resultat.ansatte.every((a) => typeof a.navIdent === "string")).toBe(true);
  });

  it("henter alle sider med kontrollsaker når enheten har flere sider enn STOR_SIDESTØRRELSE", async () => {
    testState.skalBrukeMockdata = false;
    hentKontrollsakerMock.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve({
        items: [{ id: page }],
        page,
        size: 500,
        totalItems: 3,
        totalPages: 3,
      }),
    );
    hentSaksbehandlereMock.mockResolvedValue([]);

    const { hentLederOversiktData } = await import("./loader.server");

    const resultat = await hentLederOversiktData({
      request: new Request("http://localhost"),
      innloggetBruker: lederBruker(),
    });

    expect(hentKontrollsakerMock).toHaveBeenCalledTimes(3);
    expect(hentKontrollsakerMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, enhet: ["hu424t"] }),
    );
    expect(hentKontrollsakerMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, enhet: ["hu424t"] }),
    );
    expect(hentKontrollsakerMock).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, enhet: ["hu424t"] }),
    );
    expect(resultat.saker).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("henter kontrollsaker og saksbehandlere fra backend utenfor mockmodus, filtrert på enhetsnavn", async () => {
    testState.skalBrukeMockdata = false;
    hentKontrollsakerMock.mockResolvedValue({
      items: [{ id: 1 }],
      page: 1,
      size: 500,
      totalItems: 1,
      totalPages: 1,
    });
    hentSaksbehandlereMock.mockResolvedValue([
      { navIdent: "Z1", navn: "Ada", enhet: "Nord" },
      { navIdent: "Z2", navn: "Bjørn", enhet: "Sør" },
    ]);

    const { hentLederOversiktData } = await import("./loader.server");

    const resultat = await hentLederOversiktData({
      request: new Request("http://localhost"),
      innloggetBruker: lederBruker(),
    });

    expect(getBackendOboTokenMock).toHaveBeenCalled();
    expect(hentKontrollsakerMock).toHaveBeenCalledWith(
      expect.objectContaining({ token: "token-123", enhet: ["hu424t"] }),
    );
    expect(resultat.saker).toEqual([{ id: 1 }]);
    expect(resultat.ansatte).toEqual([{ navIdent: "Z1", navn: "Ada" }]);
  });
});
