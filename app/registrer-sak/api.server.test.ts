import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import {
  hentFordelingssaker,
  hentMineSaker,
  leggTilMockSakIFordeling,
} from "~/testing/mock-store/alle-saker.server";
import { hentFilerForSak } from "~/testing/mock-store/filer.server";
import { søkSaker } from "~/søk/søk.server";
import { opprettKontrollsak } from "./api.server";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: true,
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
        personNavn: "Ola Nordmann",
        saksbehandlere: {
          eier: null,
          deltMed: [],
        },
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        prioritet: "NORMAL",
        misbruktype: ["SKJULT_SAMLIV"],
        ytelser: [
          {
            type: "Dagpenger",
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
        ytelser: [
          {
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
            belop: 300000,
          },
        ],
      }),
    });
  });

  it("legger til ny mock-sak i fordeling slik at den blir søkbar og ownerløs", async () => {
    leggTilMockSakIFordeling(state(), {
      personIdent: "12345678901",
      personNavn: "Ola Testesen",
      saksbehandlere: {
        eier: null,
        deltMed: [],
      },
      kategori: "SAMLIV",
      kilde: "NAV_KONTROLL",
      prioritet: "NORMAL",
      misbruktype: ["SKJULT_SAMLIV"],
      ytelser: [
        {
          type: "Dagpenger",
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
      søkSaker(testRequest, "12345678901").some((sak) => sak.personIdent === "12345678901"),
    ).toBe(true);
  });

  it("oppretter mock-saker med tom filliste", async () => {
    const opprettetSak = await opprettKontrollsak({
      request: testRequest,
      token: "token-123",
      payload: {
        personIdent: "12345678901",
        personNavn: "Ola Nordmann",
        saksbehandlere: {
          eier: null,
          deltMed: [],
        },
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        prioritet: "NORMAL",
        misbruktype: ["SKJULT_SAMLIV"],
        ytelser: [],
      },
    });

    expect(hentFilerForSak(state(), opprettetSak.id)).toEqual([]);
  });

  it("legger mock-sak med eier i Mine saker", async () => {
    const nySak = leggTilMockSakIFordeling(state(), {
      personIdent: "12345678901",
      personNavn: "Ola Testesen",
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
      ytelser: [
        {
          type: "Dagpenger",
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
          personNavn: "Ola Nordmann",
          saksbehandlere: {
            eier: null,
            deltMed: [],
          },
          kategori: "ARBEID",
          kilde: "SKATTEETATEN",
          prioritet: "NORMAL",
          misbruktype: ["FEIL_INNTEKTSGRUNNLAG", "SKJULT_AKTIVITET"],
          ytelser: [
            {
              type: "Dagpenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-12-31",
            },
          ],
        },
      }),
    ).resolves.toMatchObject({ id: expect.any(String) });
  });

  it("avviser ugyldige kontraktverdier i mock-modus", async () => {
    await expect(
      opprettKontrollsak({
        request: testRequest,
        token: "token-123",
        payload: {
          personIdent: "12345678901",
          personNavn: "Ola Nordmann",
          saksbehandlere: {
            eier: null,
            deltMed: [],
          },
          kategori: "ARBEID",
          kilde: "UGYLDIG_KILDE",
          prioritet: "NORMAL",
          misbruktype: ["UGYLDIG_MISBRUKSTYPE"],
          ytelser: [
            {
              type: "Dagpenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-12-31",
            },
          ],
        },
      }),
    ).rejects.toThrow("Ugyldig mock-payload for opprettelse av kontrollsak.");
  });
});
