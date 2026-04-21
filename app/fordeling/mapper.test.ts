import { describe, expect, it } from "vitest";
import { erUfordeltKontrollsak, mapKontrollsakTilFordelingSak } from "./mapper";
import type { KontrollsakResponse } from "./types.backend";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    personIdent: "12345678901",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: null,
      deltMed: [],
      opprettetAv: {
        navIdent: "Z123456",
        navn: "Oppretter",
        enhet: "4812",
      },
    },
    status: "UFORDELT",
    kategori: "ARBEID",
    kilde: "PUBLIKUM",
    misbruktype: [],
    prioritet: "NORMAL",
    avslutningskonklusjon: null,
    tilgjengeligeHandlinger: [],
    ytelser: [
      {
        id: "ytelse-1",
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-12-31",
        belop: null,
      },
    ],
    merking: null,
    resultat: null,
    opprettet: "2026-03-20T12:34:56Z",
    oppdatert: null,
    ...overrides,
  };
}

describe("Fordeling mapper", () => {
  it("behandler ufordelt sak som ufordelt", () => {
    expect(erUfordeltKontrollsak(lagKontrollsak({ status: "UFORDELT" }))).toBe(true);
  });

  it("behandler sak under utredning som fordelt", () => {
    expect(erUfordeltKontrollsak(lagKontrollsak({ status: "UTREDES" }))).toBe(false);
  });

  it("behandler tildelt sak som fordelt", () => {
    expect(erUfordeltKontrollsak(lagKontrollsak({ status: "TILDELT" }))).toBe(false);
  });

  it("mapper kontrollsak til FordelingSak", () => {
    expect(mapKontrollsakTilFordelingSak(lagKontrollsak())).toEqual({
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      navn: "Ola Nordmann",
      opprettetDato: "2026-03-20",
      oppdatertDato: "2026-03-20",
      kategori: "Arbeid",
      misbrukstyper: [],
      ytelser: ["Dagpenger"],
    });
  });

  it("bruker trygg fallback for ukjent kategori", () => {
    expect(
      mapKontrollsakTilFordelingSak(
        lagKontrollsak({ kategori: "UVENTET" as KontrollsakResponse["kategori"] }),
      ),
    ).toEqual({
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      navn: "Ola Nordmann",
      opprettetDato: "2026-03-20",
      oppdatertDato: "2026-03-20",
      kategori: "Ukjent kategori",
      misbrukstyper: [],
      ytelser: ["Dagpenger"],
    });
  });
});
