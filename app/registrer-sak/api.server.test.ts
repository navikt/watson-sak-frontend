import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetMockStore } from "~/testing/mock-store/reset.server";
import { søkSaker } from "~/søk/søk.server";
import { mockKontrollsaker } from "~/fordeling/mock-data.server";
import { leggTilMockSakIFordeling } from "~/testing/mock-store/saker/fordeling.server";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: true,
}));

describe("opprettKontrollsak", () => {
  beforeEach(() => {
    resetMockStore();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("poster OpprettKontrollsakRequest til backend med bearer-token", async () => {
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

    const { opprettKontrollsak } = await import("./api.server");

    await opprettKontrollsak({
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
      }),
    });
    vi.doMock("~/config/env.server", () => ({
      BACKEND_API_URL: "https://backend.test",
      skalBrukeMockdata: true,
    }));
  });

  it("legger til ny mock-sak i fordeling slik at den blir søkbar og ownerløs", async () => {
    leggTilMockSakIFordeling({
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
      mockKontrollsaker.some(
        (sak) => sak.personIdent === "12345678901" && sak.status === "OPPRETTET" && sak.saksbehandlere.eier === null,
      ),
    ).toBe(true);
    expect(søkSaker("12345678901").some((sak) => sak.personIdent === "12345678901")).toBe(true);
  });

  it("godtar gyldige kilde- og misbruktypeverdier fra delt kontrakt i mock-modus", async () => {
    const { opprettKontrollsak } = await import("./api.server");

    await expect(
      opprettKontrollsak({
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
    const { opprettKontrollsak } = await import("./api.server");

    await expect(
      opprettKontrollsak({
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
