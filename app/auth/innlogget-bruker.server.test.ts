import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  environment: "demo",
  brukerprofil: "saksbehandler",
}));

const parseAzureUserTokenMock = vi.hoisted(() => vi.fn());
const getValidTokenMock = vi.hoisted(() => vi.fn());
const getBackendOboTokenMock = vi.hoisted(() => vi.fn());
const hentSaksbehandlerInfoMock = vi.hoisted(() => vi.fn());

vi.mock("@navikt/oasis", () => ({
  parseAzureUserToken: parseAzureUserTokenMock,
}));

vi.mock("~/config/env.server", () => ({
  env: {
    get ENVIRONMENT() {
      return testState.environment;
    },
    get BRUKERPROFIL() {
      return testState.brukerprofil;
    },
  },
}));

vi.mock("~/logging/logging", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("./access-token", () => ({
  getValidToken: getValidTokenMock,
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("./api.server", () => ({
  hentSaksbehandlerInfo: hentSaksbehandlerInfoMock,
}));

describe("hentInnloggetBruker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.environment = "demo";
    testState.brukerprofil = "saksbehandler";
    getValidTokenMock.mockResolvedValue("gyldig-token");
    getBackendOboTokenMock.mockResolvedValue("obo-token");
    parseAzureUserTokenMock.mockReturnValue({
      ok: true,
      preferred_username: "test@nav.no",
      name: "Test Saksbehandler",
      NAVident: "Z123456",
    });
    hentSaksbehandlerInfoMock.mockResolvedValue({
      navIdent: "Z123456",
      navn: "Test Saksbehandler",
      enhet: "NAV Kontroll Øst",
      enhetId: "4812",
      erLeder: true,
    });
  });

  it("bruker Entra-token i demo i stedet for hardkodet mockbruker", async () => {
    const { hentInnloggetBruker } = await import("./innlogget-bruker.server");

    const bruker = await hentInnloggetBruker({
      request: new Request("http://localhost"),
    });

    expect(getValidTokenMock).toHaveBeenCalled();
    expect(parseAzureUserTokenMock).toHaveBeenCalledWith("gyldig-token");
    expect(bruker.preferredUsername).toBe("test@nav.no");
    expect(bruker.name).toBe("Test Saksbehandler");
    expect(bruker.navIdent).toBe("Z123456");
    expect(bruker.erLeder).toBe(false);
    expect(bruker).not.toHaveProperty("token");
  });

  it("unngår obo-oppslag i demo når miljøet fortsatt bruker mockdata", async () => {
    const { hentInnloggetBruker } = await import("./innlogget-bruker.server");

    const bruker = await hentInnloggetBruker({
      request: new Request("http://localhost"),
    });

    expect(getBackendOboTokenMock).not.toHaveBeenCalled();
    expect(hentSaksbehandlerInfoMock).not.toHaveBeenCalled();
    expect(bruker).not.toHaveProperty("token");
    expect(bruker.enhet).toBe("4812");
    expect(bruker.enhetId).toBe("4812");
  });

  it("eksponerer lederstatus fra backend utenfor demo", async () => {
    testState.environment = "dev";
    const { hentInnloggetBruker } = await import("./innlogget-bruker.server");

    const bruker = await hentInnloggetBruker({
      request: new Request("http://localhost"),
      oboToken: "obo-token",
    });

    expect(hentSaksbehandlerInfoMock).toHaveBeenCalledWith("obo-token");
    expect(bruker.erLeder).toBe(true);
  });

  it("beholder mockbruker i local-mock", async () => {
    testState.environment = "local-mock";

    const { hentInnloggetBruker } = await import("./innlogget-bruker.server");

    const bruker = await hentInnloggetBruker({
      request: new Request("http://localhost"),
    });

    expect(getValidTokenMock).not.toHaveBeenCalled();
    expect(bruker).toEqual({
      preferredUsername: "test",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "4812",
      enhetId: "4812",
      erLeder: false,
    });
  });

  it("logger inn som leder-øst i local-mock når BRUKERPROFIL er satt til leder-øst", async () => {
    testState.environment = "local-mock";
    testState.brukerprofil = "leder-øst";

    const { hentInnloggetBruker } = await import("./innlogget-bruker.server");

    const bruker = await hentInnloggetBruker({
      request: new Request("http://localhost"),
    });

    expect(getValidTokenMock).not.toHaveBeenCalled();
    expect(bruker).toEqual({
      preferredUsername: "lars.leder",
      name: "Lars Leder",
      navIdent: "L900000",
      enhet: "Øst",
      enhetId: "ky153k",
      erLeder: true,
    });
  });

  it.each([
    ["leder-vest", "Lisa Leder", "L900001", "Vest", "gu301n", true],
    ["saksbehandler-øst-1", "Simen Saksbehandler", "L900002", "Øst", "ky153k", false],
    ["saksbehandler-øst-2", "Sara Saksbehandler", "L900003", "Øst", "ky153k", false],
    ["saksbehandler-vest-1", "Silje Saksbehandler", "L900004", "Vest", "gu301n", false],
    ["saksbehandler-vest-2", "Stian Saksbehandler", "L900005", "Vest", "gu301n", false],
  ] as const)(
    "logger inn med riktig identitet i local-mock for BRUKERPROFIL=%s",
    async (profil, navn, navIdent, enhet, enhetId, erLeder) => {
      testState.environment = "local-mock";
      testState.brukerprofil = profil;

      const { hentInnloggetBruker } = await import("./innlogget-bruker.server");

      const bruker = await hentInnloggetBruker({
        request: new Request("http://localhost"),
      });

      expect(getValidTokenMock).not.toHaveBeenCalled();
      expect(bruker.name).toBe(navn);
      expect(bruker.navIdent).toBe(navIdent);
      expect(bruker.enhet).toBe(enhet);
      expect(bruker.enhetId).toBe(enhetId);
      expect(bruker.erLeder).toBe(erLeder);
    },
  );
});
