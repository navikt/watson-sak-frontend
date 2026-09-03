import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import {
  hentFordelingssaker,
  hentMineSaker,
  leggTilMockSakIFordeling,
} from "~/testing/mock-store/alle-saker.server";
import { hentDokumenttreForSak } from "~/testing/mock-store/dokumenter.server";
import { hentFilerForSak } from "~/testing/mock-store/filer.server";
import { søkSaker } from "~/søk/søk.server";
import { lastOppFil, opprettKontrollsak } from "./api.server";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: true,
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn(async () => ({ name: "Saks Behandlersen" })),
}));

vi.mock("~/logging/logging", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

describe("opprettKontrollsak", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("poster OpprettKontrollsakRequest til backend med bearer-token", async () => {
    vi.resetModules();
    vi.doMock("~/config/env.server", () => ({
      BACKEND_API_URL: "https://backend.test",
      skalBrukeMockdata: false,
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { opprettKontrollsak: opprettKontrollsakBackend } = await import("./api.server");

    await opprettKontrollsakBackend({
      request: testRequest,
      token: "token-123",
      payload: {
        personIdent: "12345678901",
        saksbehandlere: {
          eier: null,
          deltMed: [],
        },
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        prioritet: "NORMAL",
        enhet: "ky153k",
        misbruktype: ["SKJULT_SAMLIV"],
        merking: [],
        arbeidsgivere: [],
        ytelser: [
          {
            type: "DAGPENGER",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
            belop: 300000,
          },
        ],
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
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        misbruktype: ["SKJULT_SAMLIV"],
        prioritet: "NORMAL",
        enhet: "ky153k",
        ytelser: [
          {
            type: "DAGPENGER",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
            belop: 300000,
          },
        ],
        merking: [],
        arbeidsgivere: [],
      }),
    });
  });

  it("returnerer status 403, norsk feilmelding og logger med warn (ikke error) når backend nekter tilgang", async () => {
    vi.resetModules();
    vi.doMock("~/config/env.server", () => ({
      BACKEND_API_URL: "https://backend.test",
      skalBrukeMockdata: false,
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { opprettKontrollsak: opprettKontrollsakBackend } = await import("./api.server");
    const { logger } = await import("~/logging/logging");

    const resultat = await opprettKontrollsakBackend({
      request: testRequest,
      token: "token-123",
      payload: {
        personIdent: "12345678901",
        saksbehandlere: { eier: null, deltMed: [] },
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        prioritet: "NORMAL",
        enhet: "ky153k",
        misbruktype: ["SKJULT_SAMLIV"],
        merking: [],
        arbeidsgivere: [],
        ytelser: [{ type: "DAGPENGER", periodeFra: "2026-01-01", periodeTil: "2026-12-31" }],
      },
    });

    expect(resultat).toMatchObject({
      ok: false,
      status: 403,
      melding: "Ingen tilgang til å opprette kontrollsak.",
    });
    // Tilgang avvist er en forventet, håndtert tilstand — skal ikke logges som error
    // (unngår unødvendig feilstøy i logger ved normal bruk, jf. mønster for 404).
    expect(logger.warn).toHaveBeenCalledWith("Tilgang avvist ved opprettelse av kontrollsak", {
      status: 403,
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("legger til ny mock-sak i fordeling slik at den blir søkbar og ownerløs", async () => {
    leggTilMockSakIFordeling(state(), {
      personIdent: "12345678901",
      saksbehandlere: {
        eier: null,
        deltMed: [],
      },
      kategori: "SAMLIV",
      kilde: "NAV_KONTROLL",
      prioritet: "NORMAL",
      enhet: "ky153k",
      misbruktype: ["SKJULT_SAMLIV"],
      merking: [],
      ytelser: [
        {
          type: "DAGPENGER",
          periodeFra: "2026-01-01",
          periodeTil: "2026-12-31",
          belop: 300000,
        },
      ],
    });

    expect(
      hentFordelingssaker(state()).some(
        (sak) =>
          sak.personIdent === "12345678901" &&
          sak.status === "OPPRETTET" &&
          sak.saksbehandlere.eier === null,
      ),
    ).toBe(true);
    expect(
      (await søkSaker(testRequest, "12345678901")).resultater.some(
        (sak) => sak.personIdent === "12345678901",
      ),
    ).toBe(true);
  });

  it("oppretter mock-saker med tom filliste", async () => {
    const opprettetSak = await opprettKontrollsak({
      request: testRequest,
      token: "token-123",
      payload: {
        personIdent: "12345678901",
        saksbehandlere: {
          eier: null,
          deltMed: [],
        },
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        prioritet: "NORMAL",
        enhet: "ky153k",
        misbruktype: ["SKJULT_SAMLIV"],
        merking: [],
        ytelser: [],
      },
    });

    if (!opprettetSak.ok) throw new Error("Forventet ok svar");
    expect(hentDokumenttreForSak(state(), opprettetSak.sak.id)).toEqual([]);
  });

  it("legger filer til mock-saken", async () => {
    const opprettetSak = await opprettKontrollsak({
      request: testRequest,
      token: "token-123",
      payload: {
        personIdent: "12345678901",
        saksbehandlere: { eier: null, deltMed: [] },
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        prioritet: "NORMAL",
        enhet: "ky153k",
        misbruktype: ["SKJULT_SAMLIV"],
        merking: [],
        ytelser: [],
      },
    });

    if (!opprettetSak.ok) throw new Error("Forventet ok svar");
    await lastOppFil(
      testRequest,
      "token-123",
      opprettetSak.sak.id,
      new File(["innhold"], "vedlegg.pdf", {
        type: "application/pdf",
      }),
    );

    expect(hentFilerForSak(state(), opprettetSak.sak.id)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filnavn: "vedlegg.pdf",
          storrelse: 7,
          contentType: "application/pdf",
        }),
      ]),
    );
  });

  it("lagrer filer i mock-modus med innlogget brukers navn", async () => {
    vi.resetModules();
    vi.doMock("~/config/env.server", () => ({
      BACKEND_API_URL: "",
      skalBrukeMockdata: true,
      env: { ENVIRONMENT: "demo" },
    }));
    vi.doMock("~/auth/innlogget-bruker.server", () => ({
      hentInnloggetBruker: vi.fn().mockResolvedValue({ name: "Demo Bruker" }),
    }));

    const { lastOppFil } = await import("./api.server");
    const fil = new File(["filinnhold"], "demo.pdf", { type: "application/pdf" });

    await lastOppFil(testRequest, "demo-token", "sak-123", fil);

    expect(
      (await import("~/saker/filer/mock-data-filer.server")).hentFilerForSak(
        testRequest,
        "sak-123",
      ),
    ).toMatchObject([{ filnavn: "demo.pdf", opprettetAv: "Demo Bruker" }]);
  });

  it("legger mock-sak med eier i Mine saker", async () => {
    const nySak = leggTilMockSakIFordeling(state(), {
      personIdent: "12345678901",
      saksbehandlere: {
        eier: {
          navIdent: "Z999999",
          navn: "Saks Behandlersen",
          enhet: "Nord",
        },
        deltMed: [],
      },
      kategori: "SAMLIV",
      kilde: "NAV_KONTROLL",
      prioritet: "NORMAL",
      misbruktype: ["SKJULT_SAMLIV"],
      merking: [],
      ytelser: [
        {
          type: "DAGPENGER",
          periodeFra: "2026-01-01",
          periodeTil: "2026-12-31",
          belop: 300000,
        },
      ],
    });

    expect(nySak.saksbehandlere.eier?.navIdent).toBe("Z999999");
    expect(hentMineSaker(state())).toContain(nySak);
  });

  it("godtar gyldige kilde- og misbruktypeverdier fra delt kontrakt i mock-modus", async () => {
    await expect(
      opprettKontrollsak({
        request: testRequest,
        token: "token-123",
        payload: {
          personIdent: "12345678901",
          saksbehandlere: {
            eier: null,
            deltMed: [],
          },
          kategori: "ARBEID",
          kilde: "SKATTEETATEN",
          prioritet: "NORMAL",
          enhet: "ky153k",
          misbruktype: ["FEIL_INNTEKTSGRUNNLAG", "SKJULT_AKTIVITET"],
          merking: [],
          ytelser: [
            {
              type: "DAGPENGER",
              periodeFra: "2026-01-01",
              periodeTil: "2026-12-31",
            },
          ],
        },
      }),
    ).resolves.toMatchObject({ ok: true, sak: { id: expect.any(String) } });
  });

  it("avviser ugyldige kontraktverdier i mock-modus", async () => {
    // Kun prioritet valideres i mock — kategori/kilde/misbrukstype aksepteres som streng
    await expect(
      opprettKontrollsak({
        request: testRequest,
        token: "token-123",
        payload: {
          personIdent: "12345678901",
          saksbehandlere: { eier: null, deltMed: [] },
          kategori: "ARBEID",
          kilde: "UGYLDIG_KILDE",
          prioritet: "UGYLDIG_PRIORITET",
          enhet: "ky153k",
          misbruktype: ["UGYLDIG_MISBRUKSTYPE"],
          merking: [],
          ytelser: [{ type: "DAGPENGER", periodeFra: "2026-01-01", periodeTil: "2026-12-31" }],
        },
      }),
    ).rejects.toThrow("Ugyldig mock-payload for opprettelse av kontrollsak.");
  });
});
