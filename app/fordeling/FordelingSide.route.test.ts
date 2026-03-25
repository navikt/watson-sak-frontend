import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteConfig } from "~/routeConfig";
import type { Route } from "./+types/FordelingSide.route";
import { mockSaker, resetMockSaker } from "./mock-data.server";

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: true,
}));

const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const tildelKontrollsakMock = vi.hoisted(() => vi.fn());

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
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
    resetMockSaker();
    vi.clearAllMocks();
  });

  it("flytter sak ut av Fordeling i mockmiljø når den tildeles", async () => {
    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "101");
    formData.set("saksbehandler", "Kari Nordmann");

    await action({
      request: new Request("http://localhost/fordeling", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(mockSaker.find((sak) => sak.id === "101")?.status).toBe("under utredning");
    expect(tildelKontrollsakMock).not.toHaveBeenCalled();
  });

  it("kaller backend når tildeling skjer uten mockdata", async () => {
    testState.skalBrukeMockdata = false;

    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "101");
    formData.set("saksbehandler", "Kari Nordmann");

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
      saksbehandler: "Kari Nordmann",
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
    formData.set("saksbehandler", "Kari Nordmann");

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

  it("feiler med 400 når sakId eller saksbehandler bare er whitespace", async () => {
    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "   ");
    formData.set("saksbehandler", " ");

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
