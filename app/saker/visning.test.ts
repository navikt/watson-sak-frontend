import type { KontrollsakResponse } from "./types.backend";
import { describe, expect, it } from "vitest";
import {
  formaterBelop,
  formaterKategori,
  formaterPeriodeForYtelser,
  formaterSteg,
  getBeskrivelse,
  getKildeText,
  getKontaktinformasjon,
  getPersonIdent,
  getStegOgStatusTekst,
  hentSluttresultat,
  getYtelseTyper,
  hentStatusFarge,
  hentStatusTag,
} from "./visning";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 7,
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
    steg: "UTREDES",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: ["FIKTIVT_ARBEIDSFORHOLD"],
    prioritet: "NORMAL",
    status: null,
    ytelser: [
      {
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: 1000,
        endeligBelop: null,
      },
    ],
    merking: ["LIME"],
    arbeidsgivere: [],
    opprettet: "2026-01-01T00:00:00Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
    ...overrides,
  };
}

describe("sak-visning", () => {
  it("formaterer backend-steg til visningstekst", () => {
    expect(formaterSteg("UTREDES")).toBe("Utredning");
  });

  it("formaterer OPPRETTET-steg til «Opprettet»", () => {
    expect(formaterSteg("OPPRETTET")).toBe("Opprettet");
  });

  it("formaterer beløp med norsk tusen-separator", () => {
    expect(formaterBelop(1000)).toBe("1\u00a0000");
    expect(formaterBelop(0)).toBe("0");
    expect(formaterBelop(1234567)).toBe("1\u00a0234\u00a0567");
  });

  it("gir success-farge til aktive saker og warning til ventestatuser", () => {
    expect(hentStatusFarge(null)).toBe("success");
    expect(hentStatusFarge("AKTIV")).toBe("success");
    expect(hentStatusFarge("VENTER_PA_INFORMASJON")).toBe("warning");
    expect(hentStatusFarge("VENTER_PA_VEDTAK")).toBe("warning");
    expect(hentStatusFarge("VENTER_PA_RESULTAT")).toBe("warning");
    expect(hentStatusFarge("I_BERO")).toBe("warning");
    expect(hentStatusFarge("PAAKLAGET")).toBe("warning");
  });

  it("formaterer backend-kategori til visningstekst", () => {
    expect(formaterKategori("ARBEID")).toBe("Arbeid");
  });

  it("bygger periodevisning fra ytelsesobjekter", () => {
    expect(
      formaterPeriodeForYtelser([
        {
          type: "Dagpenger",
          periodeFra: "2026-01-01",
          periodeTil: "2026-12-31",
          belop: null,
          endeligBelop: null,
        },
      ]),
    ).toBe("2026-01-01 – 2026-12-31");
  });

  it("henter personident fra kontrollsak", () => {
    expect(getPersonIdent(lagKontrollsak())).toBe("10987654321");
  });

  it("henter formatert steg og status fra kontrollsak", () => {
    expect(
      getStegOgStatusTekst(lagKontrollsak({ steg: "UTREDES", status: "VENTER_PA_VEDTAK" })),
    ).toBe("Venter på vedtak · Utredning");
  });

  it("viser status med underliggende steg", () => {
    expect(getStegOgStatusTekst(lagKontrollsak({ steg: "UTREDES", status: "I_BERO" }))).toBe(
      "I bero · Utredning",
    );
  });

  it("formaterer VENTER_PA_RESULTAT-status til «Venter på resultat»", () => {
    expect(
      getStegOgStatusTekst(lagKontrollsak({ steg: "UTREDES", status: "VENTER_PA_RESULTAT" })),
    ).toBe("Venter på resultat · Utredning");
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

describe("hentSluttresultat", () => {
  it.each([
    [null, null],
    [{ utredning: { type: "HENLAGT" } }, "Henlagt"],
    [{ utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" } }, null],
    [
      {
        utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
        forvaltning: {
          type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          endeligUtfall: { type: "FEILUTBETALINGSSAK_ORDINAER" },
        },
      },
      "Feilutbetalingssak, ordinær",
    ],
    [
      {
        forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
        strafferettsligVurdering: { type: "ANMELDT" },
        politi: { type: "BOT" },
      },
      "Bot",
    ],
    [{ strafferettsligVurdering: { type: "HENLAGT" } }, "Henlagt"],
  ] as [KontrollsakResponse["resultat"], string | null][])(
    "viser resultatet saken ble avsluttet med",
    (resultat, forventet) => {
      expect(hentSluttresultat(resultat)).toBe(forventet);
    },
  );
});

describe("hentStatusTag", () => {
  it("viser status med statusfarge for saker som ikke er avsluttet", () => {
    expect(hentStatusTag({ steg: "UTREDNING", status: null, resultat: null })).toEqual({
      tekst: "Aktiv",
      farge: "success",
    });
    expect(hentStatusTag({ steg: "UTREDNING", status: "I_BERO", resultat: null })).toEqual({
      tekst: "I bero",
      farge: "warning",
    });
  });

  it("viser resultatet i nøytral farge for avsluttede saker", () => {
    expect(
      hentStatusTag({
        steg: "AVSLUTTET",
        status: "AKTIV",
        resultat: { utredning: { type: "HENLAGT" } } as KontrollsakResponse["resultat"],
      }),
    ).toEqual({ tekst: "Henlagt", farge: "neutral" });
    expect(hentStatusTag({ steg: "AVSLUTTET", status: null, resultat: null })).toEqual({
      tekst: "Ikke registrert",
      farge: "neutral",
    });
  });
});
