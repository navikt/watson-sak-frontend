import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({ skalBrukeMockdata: true }));
const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const hentInnloggetBrukerMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ enhet: "Øst", enhetId: "ky153k" }),
);
const hentStatistikkMock = vi.hoisted(() => vi.fn());
const lagMockStatistikkMock = vi.hoisted(() => vi.fn());

vi.mock("~/auth/access-token", () => ({ getBackendOboToken: getBackendOboTokenMock }));
vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: hentInnloggetBrukerMock,
}));
vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));
vi.mock("./api.server", () => ({ hentStatistikk: hentStatistikkMock }));
vi.mock("./mock.server", () => ({ lagMockStatistikk: lagMockStatistikkMock }));

describe("statistikk-loader", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    vi.clearAllMocks();
    lagMockStatistikkMock.mockReturnValue({ nøkkeltall: [] });
  });

  it("bruker brukerens avdeling og URL-perioden i mockmodus", async () => {
    const { loader } = await import("./loader.server");
    const request = new Request("http://localhost/statistikk?fra=2026-09-01&til=2026-09-30");

    await loader({ request });

    expect(lagMockStatistikkMock).toHaveBeenCalledWith(
      { nivaa: "underavdeling", fra: "2026-09-01", til: "2026-09-30", enhetId: "ky153k" },
      "Øst",
      "ky153k",
    );
    expect(getBackendOboTokenMock).not.toHaveBeenCalled();
  });

  it("sender URL-parametre til backend utenfor mockmodus", async () => {
    testState.skalBrukeMockdata = false;
    const { loader } = await import("./loader.server");
    const request = new Request(
      "http://localhost/statistikk?omfang=organisasjon&fra=2026-01-01&til=2026-01-31",
    );

    await loader({ request });

    expect(hentStatistikkMock).toHaveBeenCalledWith("token-123", {
      nivaa: "nav-kontroll",
      fra: "2026-01-01",
      til: "2026-01-31",
    });
  });

  it("oversetter årsfilteret til hele kalenderåret", async () => {
    const { loader } = await import("./loader.server");

    await loader({ request: new Request("http://localhost/statistikk?periode=year") });

    const år = new Date().getFullYear();
    expect(lagMockStatistikkMock).toHaveBeenCalledWith(
      { nivaa: "underavdeling", fra: `${år}-01-01`, til: `${år}-12-31`, enhetId: "ky153k" },
      "Øst",
      "ky153k",
    );
  });
});
