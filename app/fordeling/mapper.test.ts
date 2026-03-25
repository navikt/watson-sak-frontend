import { describe, expect, it } from "vitest";
import { erUfordeltKontrollsak, mapKontrollsakTilFordelingSak } from "./mapper";
import type { KontrollsakResponse } from "./types.backend";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    personIdent: "12345678901",
    saksbehandler: "Z123456",
    status: "OPPRETTET",
    kategori: "FEILUTBETALING",
    prioritet: "NORMAL",
    mottakEnhet: "4812",
    mottakSaksbehandler: "Z123456",
    ytelser: [
      {
        id: "ytelse-1",
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-12-31",
      },
    ],
    bakgrunn: null,
    resultat: null,
    opprettet: "2026-03-20T12:34:56Z",
    oppdatert: null,
    ...overrides,
  };
}

describe("Fordeling mapper", () => {
  it("behandler opprettet sak som ufordelt", () => {
    expect(erUfordeltKontrollsak(lagKontrollsak({ status: "OPPRETTET" }))).toBe(true);
  });

  it("behandler avklart sak som ufordelt", () => {
    expect(erUfordeltKontrollsak(lagKontrollsak({ status: "AVKLART" }))).toBe(true);
  });

  it("behandler sak under utredning som fordelt", () => {
    expect(erUfordeltKontrollsak(lagKontrollsak({ status: "UTREDES" }))).toBe(false);
  });

  it("mapper kontrollsak til FordelingSak", () => {
    expect(mapKontrollsakTilFordelingSak(lagKontrollsak())).toEqual({
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      opprettetDato: "2026-03-20",
      kategori: "Feilutbetaling",
      ytelser: ["Dagpenger"],
    });
  });

  it("bruker trygg fallback for ukjent kategori", () => {
    expect(mapKontrollsakTilFordelingSak(lagKontrollsak({ kategori: "UVENTET" }))).toEqual({
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      opprettetDato: "2026-03-20",
      kategori: "Ukjent kategori",
      ytelser: ["Dagpenger"],
    });
  });
});
