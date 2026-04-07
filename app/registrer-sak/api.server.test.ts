import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: false,
}));

describe("opprettKontrollsak", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("poster OpprettKontrollsakRequest til backend med bearer-token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { opprettKontrollsak } = await import("./api.server");

    await opprettKontrollsak({
      token: "token-123",
      payload: {
        personIdent: "12345678901",
        saksbehandler: "Z123456",
        mottakEnhet: "4812",
        mottakSaksbehandler: "Z123456",
        kategori: "SAMLIV",
        prioritet: "NORMAL",
        misbruktype: "Skjult samliv",
        ytelser: [
          {
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
          },
        ],
        enhet: "ØST",
        kilde: "INTERN",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith("https://backend.test/api/v1/kontrollsaker", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-123",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        personIdent: "12345678901",
        saksbehandler: "Z123456",
        mottakEnhet: "4812",
        mottakSaksbehandler: "Z123456",
        kategori: "SAMLIV",
        prioritet: "NORMAL",
        misbruktype: "Skjult samliv",
        ytelser: [
          {
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
          },
        ],
        enhet: "ØST",
        kilde: "INTERN",
      }),
    });
  });
});
