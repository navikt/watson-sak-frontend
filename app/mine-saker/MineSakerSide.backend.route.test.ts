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
  size: 200,
  totalItems: 0,
  totalPages: 0,
};

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

  it("kaller backend med både ansvarligNavIdent og tilknyttetNavIdent", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request("http://localhost/mine-saker"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledTimes(2);
    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({ ansvarligNavIdent: "Z999999" }),
    );
    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({ tilknyttetNavIdent: "Z999999" }),
    );
  }, 15000);

  it("ekskluderer egne saker fra deltMedSaker", async () => {
    const lagSakMedEier = (id: number, eierNavIdent: string) => ({
      id,
      saksbehandlere: {
        eier: { navIdent: eierNavIdent, navn: "Test", enhet: "4812" },
        deltMed: [],
        opprettetAv: { navIdent: "Z000000", navn: "Test", enhet: "4812" },
      },
    });
    const minSak = { ...tomSideResponse, items: [lagSakMedEier(1, "Z999999")] };
    const tilknyttedeSaker = {
      ...tomSideResponse,
      items: [lagSakMedEier(1, "Z999999"), lagSakMedEier(2, "Z888888")],
    };
    mockHentKontrollsaker.mockResolvedValueOnce(minSak).mockResolvedValueOnce(tilknyttedeSaker);

    const { loader } = await import("./MineSakerSide.route");

    const result = await loader({
      request: new Request("http://localhost/mine-saker"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(result.deltMedSaker).toHaveLength(1);
    expect(result.deltMedSaker[0].id).toBe(2);
  }, 15000);
});
