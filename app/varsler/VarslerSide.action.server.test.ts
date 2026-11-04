import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: true,
}));

const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const markerSomLestApiMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const markerSomLestMockMock = vi.hoisted(() => vi.fn());

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("~/varsler/api.server", () => ({
  markerVarselSomLest: markerSomLestApiMock,
}));

vi.mock("~/varsler/mock-data.server", () => ({
  markerVarselSomLest: markerSomLestMockMock,
}));

function lagRequest(body: Record<string, string | string[]>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      for (const v of value) formData.append(key, v);
    } else {
      formData.append(key, value);
    }
  }
  return new Request("http://localhost/varsler", { method: "POST", body: formData });
}

async function runAction(body: Record<string, string | string[]>) {
  const { action } = await import("./VarslerSide.action.server");
  const request = lagRequest(body);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return action({ request, params: {}, context: {} } as any);
}

async function runMarkerLestAction(body: Record<string, string | string[]>) {
  const { action } = await import("./marker-lest.api");
  const request = lagRequest(body);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return action({ request, params: {}, context: {} } as any);
}

describe("VarslerSide action", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("kaster 400 ved ukjent handling", async () => {
    await expect(runAction({ handling: "noe_annet" })).rejects.toMatchObject({
      init: { status: 400 },
    });
  });

  describe("mock-modus", () => {
    it("kaller markerVarselSomLest for hvert varsel-id og returnerer ok", async () => {
      const resultat = await runAction({
        handling: "marker_alle_som_lest",
        varselId: ["id-1", "id-2"],
      });

      expect(markerSomLestMockMock).toHaveBeenCalledTimes(2);
      expect(resultat).toEqual({ ok: true });
    });
  });

  describe("backend-modus", () => {
    it("kaller markerVarselSomLest for hvert varsel-id", async () => {
      testState.skalBrukeMockdata = false;

      await runAction({
        handling: "marker_alle_som_lest",
        varselId: ["id-1", "id-2", "id-3"],
      });

      expect(markerSomLestApiMock).toHaveBeenCalledTimes(3);
      expect(markerSomLestApiMock).toHaveBeenCalledWith("token-123", "id-1");
      expect(markerSomLestApiMock).toHaveBeenCalledWith("token-123", "id-2");
      expect(markerSomLestApiMock).toHaveBeenCalledWith("token-123", "id-3");
    });

    it("returnerer ok etter markering", async () => {
      testState.skalBrukeMockdata = false;

      const resultat = await runAction({
        handling: "marker_alle_som_lest",
        varselId: ["id-1"],
      });

      expect(resultat).toEqual({ ok: true });
    });

    it("returnerer teknisk feil når markering feiler", async () => {
      testState.skalBrukeMockdata = false;
      markerSomLestApiMock.mockRejectedValueOnce(new Error("backend-feil"));

      const resultat = await runAction({
        handling: "marker_alle_som_lest",
        varselId: ["id-1"],
      });

      expect(resultat).toMatchObject({
        data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[a-f0-9]{8}$/) },
        init: { status: 500 },
      });
    });
  });

  it("bevarer kjente 4xx-feil ved markering", async () => {
    testState.skalBrukeMockdata = false;
    markerSomLestApiMock.mockRejectedValueOnce(new Response(null, { status: 404 }));

    await expect(
      runAction({ handling: "marker_alle_som_lest", varselId: ["id-1"] }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("returnerer teknisk feil fra API-et for enkeltvarsel", async () => {
    testState.skalBrukeMockdata = false;
    markerSomLestApiMock.mockRejectedValueOnce(new Error("backend-feil"));

    const resultat = await runMarkerLestAction({ varselId: "id-1" });

    expect(resultat).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[a-f0-9]{8}$/) },
      init: { status: 500 },
    });
  });
});
