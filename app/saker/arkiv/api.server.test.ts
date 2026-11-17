import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  env: { ENVIRONMENT: "local-mock" },
  BACKEND_API_URL: "http://backend",
}));
vi.mock("~/logging/logging", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

const mockFetch = vi.fn();

describe("hentArkivJournalposter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    mockFetch.mockReset();
  });

  it("kaller arkiv-endepunktet og parser svaret", async () => {
    mockFetch.mockResolvedValue(
      Response.json([{ journalpostId: "1", datoOpprettet: "2026-10-12T10:00:00" }]),
    );
    const { hentArkivJournalposter } = await import("./api.server");

    const resultat = await hentArkivJournalposter("token", "14");

    expect(mockFetch).toHaveBeenCalledWith(
      "http://backend/api/v1/kontrollsaker/14/arkiv/journalposter",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      }),
    );
    expect(resultat[0]).toMatchObject({ journalpostId: "1", dokumenter: [] });
  });

  it("kaster BackendFeilException med status ved feil fra backend", async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 503 }));
    const { hentArkivJournalposter } = await import("./api.server");

    await expect(hentArkivJournalposter("token", "14")).rejects.toMatchObject({ status: 503 });
  });
});
