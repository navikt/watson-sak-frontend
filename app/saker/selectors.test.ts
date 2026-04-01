import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "./types.backend";
import {
  getAvdeling,
  getKategoriText,
  getOpprettetDato,
  getPeriodeText,
  getResultat,
  getSaksenhet,
  getStatusVariantForSak,
  getTags,
} from "./selectors";

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
      {
        id: "ytelse-2",
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
      },
    ],
    bakgrunn: {
      id: "00000000-0000-0000-0000-000000000001",
      kilde: "ANONYM_TIPS",
      innhold: "Kontrollsak-beskrivelse",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
    resultat: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    ...overrides,
  };
}

describe("saker-selectors", () => {
  it("bruker opprettet for kontrollsak", () => {
    expect(getOpprettetDato(lagKontrollsak())).toBe("2026-02-03T10:11:12Z");
  });

  it("bygger periodevisning fra backend-ytelser", () => {
    expect(getPeriodeText(lagKontrollsak())).toBe("1. jan. 2026 – 31. jan. 2026");
  });

  it("returnerer null når kontrollsak mangler ytelser", () => {
    expect(getPeriodeText(lagKontrollsak({ ytelser: [] }))).toBeNull();
  });

  it("mapper backend-kategori og backend-statusvariant for kontrollsak", () => {
    const sak = lagKontrollsak();

    expect(getKategoriText(sak)).toBe("Feilutbetaling");
    expect(getStatusVariantForSak(sak)).toBe("warning");
  });

  it("bruker mottakEnhet som saksenhet og skjuler legacy-only metadata for kontrollsak", () => {
    const sak = lagKontrollsak();

    expect(getSaksenhet(sak)).toBe("4812");
    expect(getAvdeling(sak)).toBeNull();
    expect(getTags(sak)).toEqual([]);
  });

  it("håndterer resultat null-sikkert for kontrollsak", () => {
    expect(getResultat(lagKontrollsak())).toBeNull();
  });
});
