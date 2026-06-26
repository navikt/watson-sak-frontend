/**
 * Tester for MineSakerSide loader — backend-sti (skalBrukeMockdata: false).
 * Verifiserer at ventestatus-filteret oversettes riktig til backend-parametre.
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

  it("sender INGEN ventestatus som utenBlokkering=true", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request("http://localhost/mine-saker?ventestatus=INGEN"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({
        utenBlokkering: true,
        blokkert: undefined,
      }),
    );
  }, 15000);

  it("sender blokkeringsårsak uten INGEN som blokkert[]", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request("http://localhost/mine-saker?ventestatus=VENTER_PA_INFORMASJON"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({
        utenBlokkering: undefined,
        blokkert: ["VENTER_PA_INFORMASJON"],
      }),
    );
  }, 15000);

  it("sender begge parametre når INGEN og blokkeringsårsak er valgt", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    await loader({
      request: new Request(
        "http://localhost/mine-saker?ventestatus=INGEN&ventestatus=VENTER_PA_INFORMASJON",
      ),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({
        utenBlokkering: true,
        blokkert: ["VENTER_PA_INFORMASJON"],
      }),
    );
  }, 15000);

  it("sender verken utenBlokkering eller blokkert når ventestatus-filter er tomt", async () => {
    mockHentKontrollsaker.mockResolvedValue(tomSideResponse);
    const { loader } = await import("./MineSakerSide.route");

    // Ingen ventestatus-param i URL, men status-param finnes (utløser harFilterParams=true, ventestatusFilter=[])
    await loader({
      request: new Request("http://localhost/mine-saker?status=OPPRETTET"),
      params: {},
      context: {},
    } as Parameters<typeof loader>[0]);

    expect(mockHentKontrollsaker).toHaveBeenCalledWith(
      expect.objectContaining({
        utenBlokkering: undefined,
        blokkert: undefined,
      }),
    );
  }, 15000);
});
