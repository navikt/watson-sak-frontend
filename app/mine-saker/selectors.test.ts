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
    id: "00000000-0000-4000-8000-000000000101",
    personIdent: "10987654321",
    saksbehandlere: {
      eier: null,
      deltMed: [],
      opprettetAv: { navIdent: "Z123456", navn: "Test Saksbehandler" },
    },
    status: "UFORDELT",
    kategori: "FEILUTBETALING",
    kilde: "INTERN",
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
          kategori: "FEILUTBETALING",
          ytelser: [
            {
              id: "00000000-0000-4000-8000-000000000201",
              type: "Sykepenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-01-31",
              belop: null,
            },
            {
              id: "00000000-0000-4000-8000-000000000202",
              type: "Dagpenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-01-31",
              belop: null,
            },
          ],
        }),
      ),
    ).toBe("Feilutbetaling - Sykepenger / Dagpenger");
  });

  it("bygger periode- og opprettet-tekst fra backend-felter", () => {
    const sak = lagKontrollsak({
      opprettet: "2026-02-03T10:11:12Z",
      ytelser: [
        {
          id: "00000000-0000-4000-8000-000000000203",
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
    expect(getMineSakerIkonType(lagKontrollsak({ kilde: "INTERN" }))).toBe("files");
    expect(getMineSakerIkonType(lagKontrollsak({ kilde: "ANONYM_TIPS" }))).toBe("tasklist");
  });
});
