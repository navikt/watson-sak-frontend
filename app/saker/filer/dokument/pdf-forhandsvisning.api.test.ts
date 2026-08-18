import { afterEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/pdf-forhandsvisning.api";

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));

const params = { sakId: "42", docId: "dok-1" };
const gyldigBody = JSON.stringify({ tittel: "Test" });

function lagRequest(init?: RequestInit) {
  return new Request("http://localhost/api/saker/42/dokumenter/dok-1/forhandsvisning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: gyldigBody,
    ...init,
  });
}

describe("pdf-forhandsvisning.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returnerer 405 ved annen metode enn POST", async () => {
    vi.doMock("~/config/env.server", () => ({
      skalBrukeMockdata: false,
      BACKEND_API_URL: "https://backend.test",
    }));
    const { action } = await import("./pdf-forhandsvisning.api");

    const feil = await action({
      request: lagRequest({ method: "GET", body: null }),
      params,
    } as Route.ActionArgs).catch((r) => r);

    expect(feil.init?.status).toBe(405);
  });

  it("returnerer 400 ved manglende sakId eller docId", async () => {
    vi.doMock("~/config/env.server", () => ({
      skalBrukeMockdata: false,
      BACKEND_API_URL: "https://backend.test",
    }));
    const { action } = await import("./pdf-forhandsvisning.api");

    const feil = await action({
      request: lagRequest(),
      params: { sakId: undefined, docId: "dok-1" },
    } as unknown as Route.ActionArgs).catch((r) => r);

    expect(feil.init?.status).toBe(400);
  });

  it("returnerer 400 ved ugyldig JSON-body", async () => {
    vi.doMock("~/config/env.server", () => ({
      skalBrukeMockdata: false,
      BACKEND_API_URL: "https://backend.test",
    }));
    const { action } = await import("./pdf-forhandsvisning.api");

    const feil = await action({
      request: lagRequest({ body: "{ugyldig json" }),
      params,
    } as Route.ActionArgs).catch((r) => r);

    expect(feil.init?.status).toBe(400);
  });

  it("returnerer 501 når skalBrukeMockdata er true", async () => {
    vi.doMock("~/config/env.server", () => ({
      skalBrukeMockdata: true,
      BACKEND_API_URL: "https://backend.test",
    }));
    const { action } = await import("./pdf-forhandsvisning.api");

    const feil = await action({
      request: lagRequest(),
      params,
    } as Route.ActionArgs).catch((r) => r);

    expect(feil.init?.status).toBe(501);
  });

  it("proxyer PDF-respons med riktig Content-Type og statuskode fra backend", async () => {
    vi.doMock("~/config/env.server", () => ({
      skalBrukeMockdata: false,
      BACKEND_API_URL: "https://backend.test",
    }));
    const fetchMock = vi.fn().mockResolvedValue(new Response("fake-pdf", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { action } = await import("./pdf-forhandsvisning.api");

    const respons = await action({
      request: lagRequest(),
      params,
    } as Route.ActionArgs);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.test/api/v1/kontrollsaker/42/dokumenter/dok-1/forhandsvisning",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
          Accept: "application/pdf",
        }),
      }),
    );
    expect(respons.status).toBe(200);
    expect(respons.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("videresender feilstatus fra backend", async () => {
    vi.doMock("~/config/env.server", () => ({
      skalBrukeMockdata: false,
      BACKEND_API_URL: "https://backend.test",
    }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    const { action } = await import("./pdf-forhandsvisning.api");

    const feil = await action({
      request: lagRequest(),
      params,
    } as Route.ActionArgs).catch((r) => r);

    expect(feil.init?.status).toBe(503);
  });
});
