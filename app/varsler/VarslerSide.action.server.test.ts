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
  });
});
