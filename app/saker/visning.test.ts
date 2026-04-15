import type { KontrollsakResponse } from "./types.backend";
import { describe, expect, it } from "vitest";
import {
  formaterBelop,
  formaterKategori,
  formaterPeriodeForYtelser,
  formaterStatus,
  getBeskrivelse,
  getKildeText,
  getKontaktinformasjon,
  getPersonIdent,
  getStatus,
  getYtelseTyper,
  hentStatusVariant,
} from "./visning";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    personIdent: "10987654321",
    saksbehandlere: {
      eier: {
        navIdent: "Z123456",
        navn: "Saksbehandler Navn",
      },
      deltMed: [],
      opprettetAv: {
        navIdent: "Z654321",
        navn: "Oppretter Navn",
      },
    },
    status: "UTREDES",
    kategori: "FEILUTBETALING",
    kilde: "ANONYM_TIPS",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [
      {
        id: "2fa85f64-5717-4562-b3fc-2c963f66afa6",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
    ],
    merking: null,
    resultat: null,
    opprettet: "2026-01-01T00:00:00Z",
    oppdatert: null,
    ...overrides,
  };
}

describe("sak-visning", () => {
  it("formaterer backend-status til visningstekst", () => {
    expect(formaterStatus("UTREDES")).toBe("Utredes");
  });

  it("formaterer UFORDELT-status til «Ufordelt»", () => {
    expect(formaterStatus("UFORDELT")).toBe("Ufordelt");
  });

  it("formaterer beløp med norsk tusen-separator", () => {
    expect(formaterBelop(1000)).toBe("1\u00a0000");
    expect(formaterBelop(0)).toBe("0");
    expect(formaterBelop(1234567)).toBe("1\u00a0234\u00a0567");
  });

  it("maper backend-status til riktig tag-variant", () => {
    expect(hentStatusVariant("FORVALTNING")).toBe("success");
  });

  it("formaterer backend-kategori til visningstekst", () => {
    expect(formaterKategori("FEILUTBETALING")).toBe("Feilutbetaling");
  });

  it("bygger periodevisning fra ytelsesobjekter", () => {
    expect(
      formaterPeriodeForYtelser([
        {
          id: "ytelse-1",
          type: "Dagpenger",
          periodeFra: "2026-01-01",
          periodeTil: "2026-12-31",
          belop: null,
        },
      ]),
    ).toBe("2026-01-01 – 2026-12-31");
  });

  it("henter personident fra kontrollsak", () => {
    expect(getPersonIdent(lagKontrollsak())).toBe("10987654321");
  });

  it("henter formatert status fra kontrollsak", () => {
    expect(getStatus(lagKontrollsak({ status: "FORVALTNING" }))).toBe("Forvaltning");
  });

  it("henter ytelsestyper fra kontrollsak", () => {
    expect(getYtelseTyper(lagKontrollsak())).toEqual(["Sykepenger"]);
  });

  it("returnerer ikke beskrivelse når backend ikke lenger sender feltet", () => {
    expect(getBeskrivelse(lagKontrollsak())).toBeNull();
  });

  it("henter formaterbar kilde fra kontrollsak", () => {
    expect(getKildeText(lagKontrollsak({ kilde: "EKSTERN" }))).toBe("Ekstern");
  });

  it("returnerer null for kontaktinformasjon når backend ikke lenger sender feltet", () => {
    expect(getKontaktinformasjon(lagKontrollsak())).toBeNull();
  });

  it("returnerer standardtekst når kilde mangler", () => {
    expect(getKildeText(lagKontrollsak({ kilde: undefined as never }))).toBe("Ukjent kilde");
  });
});
