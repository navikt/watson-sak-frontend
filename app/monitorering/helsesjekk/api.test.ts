import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockedFetch = vi.fn<typeof fetch>();

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://watson-admin-api.intern.dev.nav.no",
}));

describe("helsesjekk-api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockedFetch);
  });

  afterEach(() => {
    mockedFetch.mockReset();
    vi.unstubAllGlobals();
  });

  it("svarer OK uten å kalle backend når vanlig health-endepunkt brukes", async () => {
    const { loader } = await import("./api");

    const response = await loader({
      request: new Request("http://localhost/api/health"),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it("kaller Watson Admin API når backend=true er satt", async () => {
    mockedFetch.mockResolvedValue(new Response("OK", { status: 200 }));

    const { loader } = await import("./api");

    const response = await loader({
      request: new Request("http://localhost/api/health?backend=true"),
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://watson-admin-api.intern.dev.nav.no/api/health",
      expect.objectContaining({
        headers: { Accept: "application/json, text/plain" },
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      backend: {
        ok: true,
        status: 200,
      },
    });
  });

  it("returnerer 503 når backend-helsen feiler", async () => {
    mockedFetch.mockResolvedValue(new Response("Feil", { status: 500 }));

    const { loader } = await import("./api");

    const response = await loader({
      request: new Request("http://localhost/api/health?backend=true"),
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      backend: {
        ok: false,
        status: 500,
      },
    });
  });
});
