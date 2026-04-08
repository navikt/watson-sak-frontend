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
    id: "kontrollsak-1",
    personIdent: "10987654321",
    saksbehandler: "Z123456",
    status: "UTREDES",
    kategori: "FEILUTBETALING",
    prioritet: "NORMAL",
    mottakEnhet: "4812",
    mottakSaksbehandler: "Z654321",
    ytelser: [
      {
        id: "ytelse-1",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
      },
    ],
    bakgrunn: {
      id: "bakgrunn-1",
      kilde: "ANONYM_TIPS",
      innhold: "Kontrollsak-beskrivelse",
      avsender: {
        id: "avsender-1",
        navn: "Tipser",
        telefon: "99999999",
        adresse: null,
        anonym: true,
      },
      vedlegg: [],
      tilleggsopplysninger: null,
    },
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

  it("formaterer OPPRETTET-status til «Ufordelt»", () => {
    expect(formaterStatus("OPPRETTET")).toBe("Ufordelt");
  });

  it("formaterer beløp med norsk tusen-separator", () => {
    expect(formaterBelop(1000)).toBe("1\u00a0000");
    expect(formaterBelop(0)).toBe("0");
    expect(formaterBelop(1234567)).toBe("1\u00a0234\u00a0567");
  });

  it("maper backend-status til riktig tag-variant", () => {
    expect(hentStatusVariant("TIL_FORVALTNING")).toBe("success");
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
        },
      ]),
    ).toBe("2026-01-01 – 2026-12-31");
  });

  it("henter personident fra kontrollsak", () => {
    expect(getPersonIdent(lagKontrollsak())).toBe("10987654321");
  });

  it("henter formatert status fra kontrollsak", () => {
    expect(getStatus(lagKontrollsak({ status: "TIL_FORVALTNING" }))).toBe("Til forvaltning");
  });

  it("henter ytelsestyper fra kontrollsak", () => {
    expect(getYtelseTyper(lagKontrollsak())).toEqual(["Sykepenger"]);
  });

  it("henter beskrivelse fra kontrollsak", () => {
    expect(getBeskrivelse(lagKontrollsak())).toBe("Kontrollsak-beskrivelse");
  });

  it("henter formaterbar kilde fra kontrollsak", () => {
    const kontrollsak = lagKontrollsak();

    if (!kontrollsak.bakgrunn) {
      throw new Error("Forventet bakgrunn i kontrollsak-testdata");
    }

    expect(
      getKildeText(lagKontrollsak({ bakgrunn: { ...kontrollsak.bakgrunn, kilde: "EKSTERN" } })),
    ).toBe("Ekstern");
  });

  it("henter kontaktinformasjon fra kontrollsak", () => {
    expect(getKontaktinformasjon(lagKontrollsak())).toEqual({
      navn: "Tipser",
      telefon: "99999999",
      epost: undefined,
      anonymt: true,
    });
  });

  it("returnerer null eller standardtekst når bakgrunn mangler", () => {
    expect(getBeskrivelse(lagKontrollsak({ bakgrunn: null }))).toBeNull();
    expect(getKontaktinformasjon(lagKontrollsak({ bakgrunn: null }))).toBeNull();
    expect(getKildeText(lagKontrollsak({ bakgrunn: null }))).toBe("Ukjent kilde");
  });
});
