import { beforeEach, describe, expect, it, vi } from "vitest";
import { formaterMisbrukstype } from "~/saker/visning";
import { RouteConfig } from "~/routeConfig";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { hentFordelingssaker } from "~/testing/mock-store/alle-saker.server";
import type { Route } from "./+types/FordelingSide.route";

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

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
    resetDefaultSession();
    vi.clearAllMocks();
  });

  it("flytter sak ut av Fordeling i mockmiljø når den tildeles", async () => {
    const { action } = await import("./FordelingSide.server");
    const mockKontrollsaker = hentFordelingssaker(state());
    const tildelbarKontrollsakId = mockKontrollsaker.find(
      (sak) => sak.saksbehandlere.eier === null,
    )?.id;

    expect(tildelbarKontrollsakId).toBeDefined();

    if (!tildelbarKontrollsakId) {
      throw new Error("Fant ingen tildelbar kontrollsak i testdata");
    }

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", String(tildelbarKontrollsakId));
    formData.set("navIdent", "Z123456");

    await action({
      request: new Request("http://localhost/fordeling", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(
      hentFordelingssaker(state()).find((sak) => sak.id === tildelbarKontrollsakId)?.status,
    ).toBe("OPPRETTET");
    expect(
      hentFordelingssaker(state()).find((sak) => sak.id === tildelbarKontrollsakId)?.saksbehandlere
        .eier,
    ).toMatchObject({ navIdent: "Z123456", navn: "Kari Nordmann" });
    expect(tildelKontrollsakMock).not.toHaveBeenCalled();
  });

  it("kaller backend når tildeling skjer uten mockdata", async () => {
    testState.skalBrukeMockdata = false;

    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "101");
    formData.set("navIdent", "Z123456");

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
      saksbehandler: "Z123456",
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
    formData.set("navIdent", "Z123456");

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

  it("feiler med 400 når sakId eller navIdent bare er whitespace", async () => {
    const { action } = await import("./FordelingSide.server");

    const formData = new FormData();
    formData.set("handling", "tildel");
    formData.set("sakId", "   ");
    formData.set("navIdent", " ");

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
    resetDefaultSession();
    vi.clearAllMocks();
  });

  it("mapper backend-shapede mockkontrollsaker til FordelingSak i mockmiljø", async () => {
    const { loader } = await import("./FordelingSide.server");

    const resultat = await loader({
      request: new Request(`http://localhost${RouteConfig.FORDELING}`),
      params: {},
      context: {},
    } as Route.LoaderArgs);

    const mockKontrollsaker = hentFordelingssaker(state());
    const forventedeSaker = mockKontrollsaker
      .filter((sak) => sak.saksbehandlere.eier === null)
      .map((sak) => sak.id);

    expect(resultat.map((sak) => sak.id)).toEqual(forventedeSaker);
    expect(resultat[0]).toMatchObject({
      navn: mockKontrollsaker[0].personNavn ?? null,
      opprettetDato: mockKontrollsaker[0].opprettet.slice(0, 10),
      oppdatertDato: (mockKontrollsaker[0].oppdatert ?? mockKontrollsaker[0].opprettet).slice(
        0,
        10,
      ),
      misbrukstyper: mockKontrollsaker[0].misbruktype.map(formaterMisbrukstype),
      ytelser: mockKontrollsaker[0].ytelser.map((ytelse) => ytelse.type),
    });
  });
});
