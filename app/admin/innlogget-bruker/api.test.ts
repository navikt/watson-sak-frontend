import type { LoaderFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  isDev: true,
  environment: "local-backend",
}));

const hentInnloggetBrukerMock = vi.hoisted(() => vi.fn());
const getBackendOboTokenMock = vi.hoisted(() => vi.fn());

vi.mock("~/config/env.server", () => ({
  get env() {
    return {
      get ENVIRONMENT() {
        return testState.environment;
      },
    };
  },
  get isDev() {
    return testState.isDev;
  },
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: hentInnloggetBrukerMock,
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

describe("innlogget-bruker-api", () => {
  function lagLoaderArgs(): LoaderFunctionArgs {
    return {
      request: new Request("http://localhost/api/logged-in-user"),
      params: {},
      context: {},
      unstable_pattern: "/api/logged-in-user",
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    testState.isDev = true;
    testState.environment = "local-backend";
    hentInnloggetBrukerMock.mockResolvedValue({
      preferredUsername: "test@nav.no",
      name: "Test Saksbehandler",
      navIdent: "Z994531",
      organisasjoner: "4812",
    });
    getBackendOboTokenMock.mockResolvedValue("obo-token");
  });

  it("returnerer backend-token for godkjent bruker i dev", async () => {
    const { loader } = await import("./api");

    const result = await loader(lagLoaderArgs());

    expect(getBackendOboTokenMock).toHaveBeenCalledWith(expect.any(Request));
    expect(result).toEqual({
      preferredUsername: "test@nav.no",
      name: "Test Saksbehandler",
      navIdent: "Z994531",
      organisasjoner: "4812",
      token: "obo-token",
    });
  });

  it("hopper over token i local-mock", async () => {
    testState.environment = "local-mock";

    const { loader } = await import("./api");

    const result = await loader(lagLoaderArgs());

    expect(getBackendOboTokenMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      preferredUsername: "test@nav.no",
      name: "Test Saksbehandler",
      navIdent: "Z994531",
      organisasjoner: "4812",
    });
  });

  it("avviser brukere som ikke har tilgang", async () => {
    hentInnloggetBrukerMock.mockResolvedValue({
      preferredUsername: "annen@nav.no",
      name: "Annen Saksbehandler",
      navIdent: "Z111111",
      organisasjoner: "4812",
    });

    const { loader } = await import("./api");

    const result = await loader(lagLoaderArgs());

    if (!(result instanceof Response)) {
      throw new Error("Forventet Response ved manglende tilgang");
    }

    expect(getBackendOboTokenMock).not.toHaveBeenCalled();
    expect(result.status).toBe(403);
    await expect(result.json()).resolves.toEqual({ error: "Du har ikke tilgang" });
  });
});
