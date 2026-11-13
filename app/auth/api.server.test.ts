import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.hoisted(() => vi.fn());
const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
}));

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
}));

vi.mock("~/logging/logging", () => ({
  logger: loggerMock,
}));

import { hentSaksbehandlerInfo } from "./api.server";

describe("hentSaksbehandlerInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returnerer rolleinfo når backend svarer med gyldige data", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          navIdent: "Z123456",
          navn: "Test Saksbehandler",
          enhet: "Øst",
          enhetId: "ky153k",
          erLeder: false,
          erLesebruker: true,
        }),
        { status: 200 },
      ),
    );

    await expect(hentSaksbehandlerInfo("token")).resolves.toMatchObject({
      navIdent: "Z123456",
      erLesebruker: true,
    });
  });

  it("feiler ved HTTP-feil", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await expect(hentSaksbehandlerInfo("token")).rejects.toThrow(
      "Kunne ikke hente informasjon om innlogget saksbehandler.",
    );
    expect(loggerMock.warn).toHaveBeenCalledWith("Mottok feil fra innlogget-bruker-API", {
      status: 503,
    });
  });

  it.each([401, 429])("bevarer route-feilen når backend svarer %s", async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));

    await expect(hentSaksbehandlerInfo("token")).rejects.toMatchObject({
      init: { status },
    });
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it("feiler når backend svarer med ugyldig JSON", async () => {
    fetchMock.mockResolvedValue(new Response("{", { status: 200 }));

    await expect(hentSaksbehandlerInfo("token")).rejects.toThrow(
      "Kunne ikke hente informasjon om innlogget saksbehandler.",
    );
  });

  it("feiler når backend mangler leserstatus", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          navIdent: "Z123456",
          navn: "Test Saksbehandler",
          enhet: "Øst",
          enhetId: "ky153k",
          erLeder: false,
        }),
        { status: 200 },
      ),
    );

    await expect(hentSaksbehandlerInfo("token")).rejects.toThrow(
      "Kunne ikke hente informasjon om innlogget saksbehandler.",
    );
  });

  it("feiler ved nettverksfeil", async () => {
    fetchMock.mockRejectedValue(new Error("network error"));

    await expect(hentSaksbehandlerInfo("token")).rejects.toThrow(
      "Kunne ikke hente informasjon om innlogget saksbehandler.",
    );
  });
});
