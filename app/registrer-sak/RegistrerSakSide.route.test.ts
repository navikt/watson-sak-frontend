import { afterEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/RegistrerSakSide.route";

const hentInnloggetBrukerMock = vi.fn().mockResolvedValue({
  navIdent: "Z123456",
  token: "token-123",
  organisasjoner: "4812, 9999",
});

vi.mock("./api.server", () => ({
  opprettKontrollsak: vi.fn(),
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: hentInnloggetBrukerMock,
}));

describe("RegistrerSakSide action", () => {
  afterEach(() => {
    vi.clearAllMocks();
    hentInnloggetBrukerMock.mockResolvedValue({
      navIdent: "Z123456",
      token: "token-123",
      organisasjoner: "4812, 9999",
    });
  });

  it("sender backend-kompatibel payload og redirecter til dashboard", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    const formData = new FormData();
    formData.set("personIdent", "12345678901");
    formData.append("ytelser", "Dagpenger");
    formData.append("ytelser", "AAP");
    formData.set("fraDato", "2026-01-01");
    formData.set("tilDato", "2026-12-31");
    formData.set("kategori", "UDEFINERT");
    formData.set("prioritet", "HØY");
    formData.set("kilde", "INTERN");
    formData.set("bakgrunn", "Bakgrunn for saken");
    formData.set("avsenderNavn", "Tipser Testesen");
    formData.set("avsenderTelefon", "12345678");
    formData.set("avsenderAdresse", "Testveien 1");

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
        saksbehandler: "Z123456",
        mottakEnhet: "4812",
        mottakSaksbehandler: "Z123456",
        kategori: "UDEFINERT",
        prioritet: "HØY",
        ytelser: [
          {
            type: "Dagpenger",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
          },
          {
            type: "AAP",
            periodeFra: "2026-01-01",
            periodeTil: "2026-12-31",
          },
        ],
        bakgrunn: {
          kilde: "INTERN",
          innhold: "Bakgrunn for saken",
          avsender: {
            navn: "Tipser Testesen",
            telefon: "12345678",
            adresse: "Testveien 1",
            anonym: false,
          },
          vedlegg: [],
          tilleggsopplysninger: null,
        },
      },
    });

    expect(response).toBeInstanceOf(Response);
    const redirectResponse = response as Response;
    expect(redirectResponse.status).toBe(302);
    expect(redirectResponse.headers.get("Location")).toBe("/");
  });

  it("feiler når innlogget bruker mangler gyldig mottakende enhet", async () => {
    hentInnloggetBrukerMock.mockResolvedValue({
      navIdent: "Z123456",
      token: "token-123",
      organisasjoner: "Ukjent",
    });

    const { action } = await import("./RegistrerSakSide.server");

    const formData = new FormData();
    formData.set("personIdent", "12345678901");
    formData.append("ytelser", "Dagpenger");
    formData.set("fraDato", "2026-01-01");
    formData.set("tilDato", "2026-12-31");
    formData.set("kategori", "UDEFINERT");
    formData.set("prioritet", "HØY");
    formData.set("kilde", "INTERN");
    formData.set("bakgrunn", "Bakgrunn for saken");

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
  it("mapper skjema til backend payload med bakgrunn og ytelsesperioder", async () => {
    const { byggOpprettKontrollsakPayload } = await import("./RegistrerSakSide.server");

    expect(
      byggOpprettKontrollsakPayload({
        skjema: {
          personIdent: "12345678901",
          ytelser: ["Dagpenger", "AAP"],
          fraDato: "2026-01-01",
          tilDato: "2026-12-31",
          kategori: "UDEFINERT",
          prioritet: "HØY",
          kilde: "INTERN",
          bakgrunn: "Bakgrunn for saken",
          avsenderNavn: "Tipser Testesen",
          avsenderTelefon: "12345678",
          avsenderAdresse: "Testveien 1",
          avsenderAnonym: false,
        },
        navIdent: "Z123456",
        mottakEnhet: "4812",
      }),
    ).toEqual({
      personIdent: "12345678901",
      saksbehandler: "Z123456",
      mottakEnhet: "4812",
      mottakSaksbehandler: "Z123456",
      kategori: "UDEFINERT",
      prioritet: "HØY",
      ytelser: [
        {
          type: "Dagpenger",
          periodeFra: "2026-01-01",
          periodeTil: "2026-12-31",
        },
        {
          type: "AAP",
          periodeFra: "2026-01-01",
          periodeTil: "2026-12-31",
        },
      ],
      bakgrunn: {
        kilde: "INTERN",
        innhold: "Bakgrunn for saken",
        avsender: {
          navn: "Tipser Testesen",
          telefon: "12345678",
          adresse: "Testveien 1",
          anonym: false,
        },
        vedlegg: [],
        tilleggsopplysninger: null,
      },
    });
  });
});
