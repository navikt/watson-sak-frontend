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
    saksbehandler: "Z123456",
    status: "OPPRETTET",
    kategori: "FEILUTBETALING",
    prioritet: "NORMAL",
    mottakEnhet: "4812",
    mottakSaksbehandler: "Z654321",
    ytelser: [],
    bakgrunn: null,
    resultat: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    ...overrides,
  };
}

describe("Mine saker selectors", () => {
  it("mapper backend-status OPPRETTET til aktive", () => {
    expect(getMineSakerGruppeStatus(lagKontrollsak({ status: "OPPRETTET" }))).toBe("aktive");
  });

  it("mapper backend-status TIL_FORVALTNING til ventende", () => {
    expect(getMineSakerGruppeStatus(lagKontrollsak({ status: "TIL_FORVALTNING" }))).toBe(
      "ventende",
    );
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
              id: "ytelse-1",
              type: "Sykepenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-01-31",
            },
            {
              id: "ytelse-2",
              type: "Dagpenger",
              periodeFra: "2026-01-01",
              periodeTil: "2026-01-31",
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
          id: "ytelse-1",
          type: "Sykepenger",
          periodeFra: "2026-01-01",
          periodeTil: "2026-01-31",
        },
      ],
    });

    expect(getMineSakerPeriodeTekst(sak)).toBe("Ytelser i perioden 01.01.2026 - 31.01.2026");
    expect(getMineSakerOpprettetTekst(sak)).toBe("Opprettet 03.02.2026");
  });

  it("utleder ikon-type fra backend-kilde", () => {
    expect(getMineSakerIkonType(lagKontrollsak({ bakgrunn: null }))).toBe("files");
    expect(
      getMineSakerIkonType(
        lagKontrollsak({
          bakgrunn: {
            id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            kilde: "ANONYM_TIPS",
            innhold: "Tips",
            avsender: null,
            vedlegg: [],
            tilleggsopplysninger: null,
          },
        }),
      ),
    ).toBe("tasklist");
  });
});
