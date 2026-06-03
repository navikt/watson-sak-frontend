import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
}));

const gyldigVarselPageResponse = {
  items: [
    {
      id: "550e8400-e29b-41d4-a716-446655440001",
      sakId: 42,
      tittel: "Ny oppgave tildelt",
      beskrivelse: "Du har fått tildelt en oppgave på sak 42.",
      opprettet: "2026-06-03T10:00:00Z",
      lestTidspunkt: null,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440002",
      sakId: 7,
      tittel: "Eldre varsel",
      beskrivelse: "Et eldre varsel.",
      opprettet: "2026-06-01T08:00:00Z",
      lestTidspunkt: null,
    },
  ],
  page: 1,
  size: 50,
  totalItems: 2,
  totalPages: 1,
};

describe("varsler api.server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  describe("hentUlesteVarsler", () => {
    it("kaller riktig URL med bearer-token og kunUleste=true", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => gyldigVarselPageResponse,
      });
      vi.stubGlobal("fetch", fetchMock);

      const { hentUlesteVarsler } = await import("./api.server");
      await hentUlesteVarsler("token-abc");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://backend.test/api/v1/varsler?kunUleste=true&page=1&size=50",
        {
          headers: {
            Authorization: "Bearer token-abc",
            Accept: "application/json",
          },
        },
      );
    });

    it("mapper backend-respons til frontend-Varsel-format", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => gyldigVarselPageResponse,
      });
      vi.stubGlobal("fetch", fetchMock);

      const { hentUlesteVarsler } = await import("./api.server");
      const varsler = await hentUlesteVarsler("token-abc");

      expect(varsler[0]).toMatchObject({
        id: "550e8400-e29b-41d4-a716-446655440001",
        sakId: "42",
        tittel: "Ny oppgave tildelt",
        tekst: "Du har fått tildelt en oppgave på sak 42.",
        tidspunkt: "2026-06-03T10:00:00Z",
        erLest: false,
      });
    });

    it("sorterer varsler synkende på tidspunkt", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => gyldigVarselPageResponse,
      });
      vi.stubGlobal("fetch", fetchMock);

      const { hentUlesteVarsler } = await import("./api.server");
      const varsler = await hentUlesteVarsler("token-abc");

      expect(varsler[0].tidspunkt > varsler[1].tidspunkt).toBe(true);
    });

    it("kaster feil ved ikke-ok HTTP-svar", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

      const { hentUlesteVarsler } = await import("./api.server");
      await expect(hentUlesteVarsler("token-abc")).rejects.toThrow("Kunne ikke hente varsler.");
    });

    it("kaster feil ved ugyldig schema fra backend", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ ugyldig: true }),
        }),
      );

      const { hentUlesteVarsler } = await import("./api.server");
      await expect(hentUlesteVarsler("token-abc")).rejects.toThrow(
        "Ugyldig svar fra watson-admin-api",
      );
    });
  });

  describe("markerVarselSomLest", () => {
    it("sender POST til riktig URL med bearer-token", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
      vi.stubGlobal("fetch", fetchMock);

      const { markerVarselSomLest } = await import("./api.server");
      await markerVarselSomLest("token-abc", "550e8400-e29b-41d4-a716-446655440001");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://backend.test/api/v1/varsler/550e8400-e29b-41d4-a716-446655440001/lest",
        {
          method: "POST",
          headers: { Authorization: "Bearer token-abc" },
        },
      );
    });

    it("er idempotent — kaster ikke feil ved 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

      const { markerVarselSomLest } = await import("./api.server");
      await expect(markerVarselSomLest("token-abc", "ukjent-id")).resolves.toBeUndefined();
    });

    it("kaster feil ved andre feilkoder", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      const { markerVarselSomLest } = await import("./api.server");
      await expect(
        markerVarselSomLest("token-abc", "550e8400-e29b-41d4-a716-446655440001"),
      ).rejects.toThrow("Kunne ikke markere varsel som lest.");
    });
  });
});

describe("varsler api.server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  describe("hentUlesteVarsler", () => {
    it("kaller riktig URL med bearer-token og kunUleste=true", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => gyldigVarselPageResponse,
      });
      vi.stubGlobal("fetch", fetchMock);

      const { hentUlesteVarsler } = await import("./api.server");
      await hentUlesteVarsler("token-abc");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://backend.test/api/v1/varsler?kunUleste=true&page=1&size=50",
        {
          headers: {
            Authorization: "Bearer token-abc",
            Accept: "application/json",
          },
        },
      );
    });

    it("mapper backend-respons til frontend-Varsel-format", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => gyldigVarselPageResponse,
        }),
      );

      const { hentUlesteVarsler } = await import("./api.server");
      const varsler = await hentUlesteVarsler("token-abc");

      expect(varsler[0]).toMatchObject({
        id: "550e8400-e29b-41d4-a716-446655440001",
        sakId: "42",
        tittel: "Ny oppgave tildelt",
        tekst: "Du har fått tildelt en oppgave på sak 42.",
        tidspunkt: "2026-06-03T10:00:00Z",
        erLest: false,
      });
    });

    it("sorterer varsler synkende på tidspunkt", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => gyldigVarselPageResponse,
        }),
      );

      const { hentUlesteVarsler } = await import("./api.server");
      const varsler = await hentUlesteVarsler("token-abc");

      expect(varsler[0].tidspunkt > varsler[1].tidspunkt).toBe(true);
    });

    it("kaster feil ved ikke-ok HTTP-svar", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

      const { hentUlesteVarsler } = await import("./api.server");
      await expect(hentUlesteVarsler("token-abc")).rejects.toThrow("Kunne ikke hente varsler.");
    });

    it("kaster feil ved ugyldig schema fra backend", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ ugyldig: true }),
        }),
      );

      const { hentUlesteVarsler } = await import("./api.server");
      await expect(hentUlesteVarsler("token-abc")).rejects.toThrow(
        "Ugyldig svar fra watson-admin-api",
      );
    });
  });

  describe("markerVarselSomLest", () => {
    it("sender POST til riktig URL med bearer-token", async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
      vi.stubGlobal("fetch", fetchMock);

      const { markerVarselSomLest } = await import("./api.server");
      await markerVarselSomLest("token-abc", "018f1234-5678-7abc-def0-123456789abc");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://backend.test/api/v1/varsler/018f1234-5678-7abc-def0-123456789abc/lest",
        {
          method: "POST",
          headers: { Authorization: "Bearer token-abc" },
        },
      );
    });

    it("er idempotent — kaster ikke feil ved 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));

      const { markerVarselSomLest } = await import("./api.server");
      await expect(markerVarselSomLest("token-abc", "ukjent-id")).resolves.toBeUndefined();
    });

    it("kaster feil ved andre feilkoder", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

      const { markerVarselSomLest } = await import("./api.server");
      await expect(
        markerVarselSomLest("token-abc", "018f1234-5678-7abc-def0-123456789abc"),
      ).rejects.toThrow("Kunne ikke markere varsel som lest.");
    });
  });
});
