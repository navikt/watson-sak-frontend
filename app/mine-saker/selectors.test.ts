import { describe, expect, it } from "vitest";
import {
  getMineSakerGruppeStatus,
  getMineSakerIkonType,
  getMineSakerOpprettetTekst,
  getMineSakerPeriodeTekst,
  getMineSakerTittel,
} from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "ks-101",
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "UFORDELT",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [],
    merking: null,
    resultat: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    ...overrides,
  };
}

describe("Mine saker selectors", () => {
  it("mapper backend-status UFORDELT til aktive", () => {
    expect(getMineSakerGruppeStatus(lagKontrollsak({ status: "UFORDELT" }))).toBe("aktive");
  });

  it("mapper backend-status FORVALTNING til ventende", () => {
    expect(getMineSakerGruppeStatus(lagKontrollsak({ status: "FORVALTNING" }))).toBe("ventende");
  });

  it("mapper backend-status I_BERO til aktive eksplisitt", () => {
    expect(getMineSakerGruppeStatus(lagKontrollsak({ status: "I_BERO" }))).toBe("aktive");
  });

  it("mapper backend-status AVSLUTTET til fullførte", () => {
    expect(getMineSakerGruppeStatus(lagKontrollsak({ status: "AVSLUTTET" }))).toBe("fullførte");
  });

  it("mapper backend-status UTREDES til aktive", () => {
    expect(getMineSakerGruppeStatus(lagKontrollsak({ status: "UTREDES" }))).toBe("aktive");
  });

  it("bygger tittel fra backend-kategori og ytelsestyper", () => {
    expect(
      getMineSakerTittel(
        lagKontrollsak({
          kategori: "ARBEID",
          ytelser: [
            {
              id: "ytelse-1",
              type: "Sykepenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-01-31",
              belop: null,
            },
            {
              id: "ytelse-2",
              type: "Dagpenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-01-31",
              belop: null,
            },
          ],
        }),
      ),
    ).toBe("Arbeid - Sykepenger / Dagpenger");
  });

  it("bygger periode- og opprettet-tekst fra backend-felter", () => {
    const sak = lagKontrollsak({
      opprettet: "2026-02-03T10:11:12Z",
      ytelser: [
        {
          id: "ytelse-1",
          type: "Sykepenger",
          periodeFra: "2026-01-01",
          periodeTil: "2026-01-31",
          belop: null,
        },
      ],
    });

    expect(getMineSakerPeriodeTekst(sak)).toBe("Ytelser i perioden 01.01.2026 - 31.01.2026");
    expect(getMineSakerOpprettetTekst(sak)).toBe("Opprettet 03.02.2026");
  });

  it("utleder ikon-type fra backend-kilde", () => {
    expect(getMineSakerIkonType(lagKontrollsak({ kilde: "NAV_KONTROLL" }))).toBe("files");
    expect(getMineSakerIkonType(lagKontrollsak({ kilde: "PUBLIKUM" }))).toBe("tasklist");
  });
});
