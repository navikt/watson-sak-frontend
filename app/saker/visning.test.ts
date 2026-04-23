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
    id: "00000000-0000-4000-8000-000000000001",
    personIdent: "10987654321",
    personNavn: "Kari Nordmann",
    saksbehandlere: {
      eier: {
        navIdent: "Z123456",
        navn: "Saks Behandler",
        enhet: "4812",
      },
      deltMed: [],
      opprettetAv: {
        navIdent: "Z654321",
        navn: "Oppretter",
        enhet: "4801",
      },
    },
    status: "UTREDES",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: ["FIKTIVT_ARBEIDSFORHOLD"],
    prioritet: "NORMAL",
    iBero: false,
    avslutningskonklusjon: null,
    tilgjengeligeHandlinger: [],
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000000002",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: 1000,
      },
    ],
    merking: "PRIORITERT",
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

  it("formaterer OPPRETTET-status til «Opprettet»", () => {
    expect(formaterStatus("OPPRETTET")).toBe("Opprettet");
  });

  it("formaterer beløp med norsk tusen-separator", () => {
    expect(formaterBelop(1000)).toBe("1\u00a0000");
    expect(formaterBelop(0)).toBe("0");
    expect(formaterBelop(1234567)).toBe("1\u00a0234\u00a0567");
  });

  it("maper backend-status til riktig tag-variant", () => {
    expect(hentStatusVariant("ANMELDT")).toBe("success");
  });

  it("formaterer backend-kategori til visningstekst", () => {
    expect(formaterKategori("ARBEID")).toBe("Arbeid");
  });

  it("bygger periodevisning fra ytelsesobjekter", () => {
    expect(
      formaterPeriodeForYtelser([
        {
          id: "00000000-0000-4000-8000-000000000003",
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
    expect(getStatus(lagKontrollsak({ status: "VENTER_PA_VEDTAK" }))).toBe("Venter på vedtak");
  });

  it("viser i bero med underliggende status", () => {
    expect(getStatus(lagKontrollsak({ status: "UTREDES", iBero: true }))).toBe("I bero · Utredes");
  });

  it("henter ytelsestyper fra kontrollsak", () => {
    expect(getYtelseTyper(lagKontrollsak())).toEqual(["Sykepenger"]);
  });

  it("returnerer null for beskrivelse når backend ikke lenger har bakgrunn", () => {
    expect(getBeskrivelse(lagKontrollsak())).toBeNull();
  });

  it("henter formaterbar kilde fra kontrollsak", () => {
    expect(getKildeText(lagKontrollsak({ kilde: "POLITIET" }))).toBe("Politiet");
  });

  it("returnerer null for kontaktinformasjon når backend ikke lenger har avsender på kontrollsak", () => {
    expect(getKontaktinformasjon(lagKontrollsak())).toBeNull();
  });

  it("returnerer standardtekst når kilde mangler", () => {
    expect(getKildeText(lagKontrollsak({ kilde: undefined as never }))).toBe("Ukjent kilde");
  });
});
