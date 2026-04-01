import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteConfig } from "~/routeConfig";
import type { Route } from "./+types/FordelingSide.route";
import { mockKontrollsaker } from "./mock-data.server";
import { resetMockSaker } from "./mock-data.server";

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
    const tildelbarKontrollsakId = mockKontrollsaker.find((sak) => sak.status === "OPPRETTET")?.id;

    expect(tildelbarKontrollsakId).toBeDefined();

    if (!tildelbarKontrollsakId) {
      throw new Error("Fant ingen tildelbar kontrollsak i testdata");
    }

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", tildelbarKontrollsakId);
    formData.set("saksbehandler", "Kari Nordmann");

    await action({
      request: new Request("http://localhost/fordeling", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(mockKontrollsaker.find((sak) => sak.id === tildelbarKontrollsakId)?.status).toBe(
      "UTREDES",
    );
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

describe("FordelingSide loader", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    resetMockSaker();
    vi.clearAllMocks();
  });

  it("mapper backend-shapede mockkontrollsaker til FordelingSak i mockmiljø", async () => {
    const { loader } = await import("./FordelingSide.server");

    const resultat = await loader({
      request: new Request(`http://localhost${RouteConfig.FORDELING}`),
      params: {},
      context: {},
    } as Route.LoaderArgs);

    const forventedeSaker = mockKontrollsaker
      .filter((sak) => sak.status === "OPPRETTET" || sak.status === "AVKLART")
      .map((sak) => sak.id);

    expect(resultat.map((sak) => sak.id)).toEqual(forventedeSaker);
    expect(resultat[0]).toMatchObject({
      opprettetDato: mockKontrollsaker[0].opprettet.slice(0, 10),
      ytelser: mockKontrollsaker[0].ytelser.map((ytelse) => ytelse.type),
    });
  });
});
