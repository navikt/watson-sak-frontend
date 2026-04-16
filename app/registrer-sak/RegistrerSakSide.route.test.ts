import { afterEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/RegistrerSakSide.route";

const hentInnloggetBrukerMock = vi.fn().mockResolvedValue({
  navIdent: "Z123456",
  name: "Test Saksbehandler",
  token: "token-123",
  organisasjoner: "4812, 9999",
});

vi.mock("./api.server", () => ({
  opprettKontrollsak: vi.fn().mockResolvedValue({ id: "00000000-0000-4000-8000-000000301000" }),
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: hentInnloggetBrukerMock,
}));

describe("OpprettSakSide action", () => {
  afterEach(() => {
    vi.clearAllMocks();
    hentInnloggetBrukerMock.mockResolvedValue({
      navIdent: "Z123456",
      name: "Test Saksbehandler",
      token: "token-123",
      organisasjoner: "4812, 9999",
    });
  });

  it("sender backend-kompatibel payload og redirecter til ny sakdetalj", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    const formData = new FormData();
    formData.set("personIdent", "12345678901");
    formData.set("personNavn", "Ola Testesen");
    formData.append("ytelser", "Dagpenger");
    formData.append("ytelser", "AAP");
    formData.set("fraDato", "2026-01-01");
    formData.set("tilDato", "2026-12-31");
    formData.set("kategori", "DOKUMENTFALSK");
    formData.set("kilde", "NAV_KONTROLL");
    formData.set("enhet", "ØST");

    const response = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(opprettKontrollsak).toHaveBeenCalledWith({
      token: "token-123",
      payload: {
        personIdent: "12345678901",
        personNavn: "Ola Testesen",
        saksbehandlere: {
          eier: {
            navIdent: "Z123456",
            navn: "Test Saksbehandler",
            enhet: "4812",
          },
          deltMed: [],
        },
        kategori: "DOKUMENTFALSK",
        kilde: "NAV_KONTROLL",
        prioritet: "NORMAL",
        misbruktype: [],
        merking: undefined,
        ytelser: [
          {
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
            belop: undefined,
          },
          {
            type: "AAP",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
            belop: undefined,
          },
        ],
      },
    });

    expect(response).toBeInstanceOf(Response);
    const redirectResponse = response as Response;
    expect(redirectResponse.status).toBe(302);
    expect(redirectResponse.headers.get("Location")).toBe("/saker/301");
  });

  it("feiler når innlogget bruker mangler gyldig mottakende enhet", async () => {
    hentInnloggetBrukerMock.mockResolvedValue({
      navIdent: "Z123456",
      name: "Test Saksbehandler",
      token: "token-123",
      organisasjoner: "Ukjent",
    });

    const { action } = await import("./RegistrerSakSide.server");

    const formData = new FormData();
    formData.set("personIdent", "12345678901");
    formData.set("personNavn", "Ola Testesen");
    formData.append("ytelser", "Dagpenger");
    formData.set("fraDato", "2026-01-01");
    formData.set("tilDato", "2026-12-31");
    formData.set("kategori", "DOKUMENTFALSK");
    formData.set("kilde", "NAV_KONTROLL");
    formData.set("enhet", "ØST");

    await expect(
      action({
        request: new Request("http://localhost/registrer-sak", {
          method: "POST",
          body: formData,
        }),
        params: {},
        context: {},
      } as Route.ActionArgs),
    ).rejects.toThrow("Ugyldig mottakende enhet: 'Ukjent'. Forventet enhetsnummer (4 sifre).");
  });
});

describe("byggOpprettKontrollsakPayload", () => {
  it("mapper skjema til backend payload", async () => {
    const { byggOpprettKontrollsakPayload } = await import("./RegistrerSakSide.server");

    expect(
      byggOpprettKontrollsakPayload({
        skjema: {
          personIdent: "12345678901",
          ytelser: ["Dagpenger", "AAP"],
          fraDato: "2026-01-01",
          tilDato: "2026-12-31",
          kategori: "SAMLIV",
          misbruktype: "SKJULT_SAMLIV",
          merking: "PRIORITERT",
          kilde: "NAV_KONTROLL",
          enhet: "ØST",
          caBeløp: 300000,
          organisasjonsnummer: "123456789",
        },
        navIdent: "Z123456",
        mottakEnhet: "4812",
        personNavn: "Ola Testesen",
        saksbehandlerNavn: "Test Saksbehandler",
      }),
    ).toEqual({
      personIdent: "12345678901",
      personNavn: "Ola Testesen",
      saksbehandlere: {
        eier: {
          navIdent: "Z123456",
          navn: "Test Saksbehandler",
          enhet: "4812",
        },
        deltMed: [],
      },
      kategori: "SAMLIV",
      kilde: "NAV_KONTROLL",
      prioritet: "NORMAL",
      misbruktype: ["SKJULT_SAMLIV"],
      merking: "PRIORITERT",
      ytelser: [
        {
          type: "Dagpenger",
          periodeFra: "2026-01-01",
          periodeTil: "2026-12-31",
          belop: 300000,
        },
        {
          type: "AAP",
          periodeFra: "2026-01-01",
          periodeTil: "2026-12-31",
          belop: 300000,
        },
      ],
    });
  });
});
