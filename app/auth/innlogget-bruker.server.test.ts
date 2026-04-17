import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  environment: "demo",
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
      organisasjoner: ["4812", "9999"],
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
    expect(bruker.organisasjoner).toBe("Ukjent");
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
      navIdent: "S133337",
      organisasjoner: "4812",
    });
  });
});
