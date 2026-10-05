import { afterEach, describe, expect, it, vi } from "vitest";
import { lagMockStatistikk } from "./mock.server";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
}));

describe("statistikk api.server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ["meg", "MEG"],
    ["underavdeling", "UNDERAVDELING"],
    ["hovedavdeling", "HOVEDAVDELING"],
    ["nav-kontroll", "NAV_KONTROLL"],
  ] as const)("mapper %s til backend-nivå", async (nivaa, backendNivaa) => {
    const spørring = {
      nivaa,
      fra: "2026-01-01",
      til: "2026-01-31",
      ...(nivaa === "underavdeling" ? { enhetId: "ky153k" } : {}),
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(lagMockStatistikk(spørring, "Øst", "ky153k")), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { hentStatistikk } = await import("./api.server");
    await hentStatistikk("token-123", spørring);

    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(url.searchParams.get("nivaa")).toBe(backendNivaa);
    expect(url.searchParams.get("fra")).toBe("2026-01-01");
    expect(url.searchParams.get("til")).toBe("2026-01-31");
    expect(options.headers).toEqual({
      Authorization: "Bearer token-123",
      Accept: "application/json",
    });
  });
});
