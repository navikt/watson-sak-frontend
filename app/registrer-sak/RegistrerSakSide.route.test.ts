import { afterEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/RegistrerSakSide.route";

const hentInnloggetBrukerMock = vi.fn().mockResolvedValue({
  navIdent: "Z123456",
  name: "Test Saksbehandler",
  token: "token-123",
});

vi.mock("./api.server", () => ({
  opprettKontrollsak: vi.fn(),
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
    formData.set("kilde", "INTERN");
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
        saksbehandlere: {
          eier: {
            navIdent: "Z123456",
            navn: "Test Saksbehandler",
          },
          deltMed: [],
        },
        kategori: "UDEFINERT",
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
        kilde: "INTERN",
      },
    });

    expect(response).toBeInstanceOf(Response);
    const redirectResponse = response as Response;
    expect(redirectResponse.status).toBe(302);
    expect(redirectResponse.headers.get("Location")).toBe("/");
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
          kategori: "MISBRUK",
          misbruktype: "Skjult samliv",
          merking: "PRIORITERT",
          kilde: "INTERN",
          enhet: "ØST",
          caBeløp: 300000,
          organisasjonsnummer: "123456789",
        },
        navIdent: "Z123456",
        navn: "Test Saksbehandler",
      }),
    ).toEqual({
      personIdent: "12345678901",
      saksbehandlere: {
        eier: {
          navIdent: "Z123456",
          navn: "Test Saksbehandler",
        },
        deltMed: [],
      },
      kategori: "MISBRUK",
      prioritet: "NORMAL",
      misbruktype: ["Skjult samliv"],
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
      kilde: "INTERN",
    });
  });
});
