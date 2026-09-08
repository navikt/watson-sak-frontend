import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InnloggetBruker } from "~/auth/innlogget-bruker.server";

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: false,
}));

const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const hentLederStatistikkMock = vi.hoisted(() => vi.fn());
const lagMockLederStatistikkMock = vi.hoisted(() => vi.fn());

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));

vi.mock("./api.server", () => ({
  hentLederStatistikk: hentLederStatistikkMock,
}));

vi.mock("./mock.server", () => ({
  lagMockLederStatistikk: lagMockLederStatistikkMock,
}));

const respons = {
  enhetId: "hu424t",
  enhetNavn: "Nord",
  enhet: {
    totaltAntallIkkeAvsluttede: 7,
    antallOverFrist: 2,
    perStatus: {
      OPPRETTET: 1,
      UTREDES: 2,
      STRAFFERETTSLIG_VURDERING: 1,
      ANMELDT: 2,
      HENLAGT: 1,
    },
    perArbeidsstatus: {
      IKKE_BLOKKERT: 4,
      VENTER_PA_INFORMASJON: 1,
      VENTER_PA_VEDTAK: 1,
      I_BERO: 1,
    },
    antallUfordelte: 1,
  },
  ansatte: {
    tilgjengelig: true,
    liste: [],
    ufordelt: { totaltAntallIkkeAvsluttede: 1, antallOverFrist: 0 },
  },
};

const leder: InnloggetBruker = {
  preferredUsername: "leder",
  name: "Leder Ledersen",
  navIdent: "Z888888",
  enhet: "Nord",
  enhetId: "hu424t",
  erLeder: true,
};

describe("hentLederOversiktData", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = false;
    vi.clearAllMocks();
    hentLederStatistikkMock.mockResolvedValue(respons);
    lagMockLederStatistikkMock.mockReturnValue(respons);
  });

  it("gjør ett backendkall uten klientstyrt enhet", async () => {
    const { hentLederOversiktData } = await import("./loader.server");

    const resultat = await hentLederOversiktData({
      request: new Request("http://localhost"),
      innloggetBruker: leder,
    });

    expect(getBackendOboTokenMock).toHaveBeenCalledTimes(1);
    expect(hentLederStatistikkMock).toHaveBeenCalledWith("token-123");
    expect(hentLederStatistikkMock).toHaveBeenCalledTimes(1);
    expect(resultat).toEqual(respons);
  });

  it("bruker samme kontrakt i mockmodus", async () => {
    testState.skalBrukeMockdata = true;
    const request = new Request("http://localhost");
    const { hentLederOversiktData } = await import("./loader.server");

    const resultat = await hentLederOversiktData({ request, innloggetBruker: leder });

    expect(getBackendOboTokenMock).not.toHaveBeenCalled();
    expect(lagMockLederStatistikkMock).toHaveBeenCalledWith(request, "hu424t", "Nord");
    expect(resultat).toEqual(respons);
  });
});
