import { describe, expect, it } from "vitest";
import { erEierlosKontrollsak, mapKontrollsakTilFordelingSak } from "./mapper";
import type { KontrollsakResponse } from "./types.backend";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 4,
    kontrollobjekt: { personIdent: "12345678901", navn: "Ola Nordmann" },
    saksbehandlere: {
      eier: null,
      deltMed: [],
      opprettetAv: {
        navIdent: "Z123456",
        navn: "Oppretter",
        enhet: "4812",
      },
    },
    status: "OPPRETTET",
    kategori: "ARBEID",
    kilde: "PUBLIKUM",
    misbruktype: [],
    prioritet: "NORMAL",
    blokkert: null,
    henleggelsesarsak: null,
    ytelser: [
      {
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-12-31",
        belop: null,
        endeligBelop: null,
      },
    ],
    merking: [],
    opprettet: "2026-03-20T12:34:56Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    ...overrides,
  };
}

describe("Fordeling mapper", () => {
  it("behandler eierløs sak som klar for fordeling", () => {
    expect(erEierlosKontrollsak(lagKontrollsak({ status: "OPPRETTET" }))).toBe(true);
  });

  it("behandler eierløs sak under utredning som klar for fordeling", () => {
    expect(erEierlosKontrollsak(lagKontrollsak({ status: "UTREDES" }))).toBe(true);
  });

  it("behandler eid sak som ikke klar for fordeling", () => {
    expect(
      erEierlosKontrollsak(
        lagKontrollsak({
          saksbehandlere: {
            eier: { navIdent: "Z999999", navn: "Eier", enhet: "4812" },
            deltMed: [],
            opprettetAv: { navIdent: "Z123456", navn: "Oppretter", enhet: "4812" },
          },
        }),
      ),
    ).toBe(false);
  });

  it("mapper kontrollsak til FordelingSak", () => {
    expect(mapKontrollsakTilFordelingSak(lagKontrollsak())).toEqual({
      id: 4,
      navn: "Ola Nordmann",
      opprettetDato: "2026-03-20",
      oppdatertDato: "2026-03-20",
      kategori: "Arbeid",
      misbrukstyper: [],
      ytelser: ["Dagpenger"],
      status: "Opprettet",
      ventestatus: null,
    });
  });

  it("bruker trygg fallback for ukjent kategori", () => {
    expect(
      mapKontrollsakTilFordelingSak(
        lagKontrollsak({ kategori: "UVENTET" as KontrollsakResponse["kategori"] }),
      ),
    ).toEqual({
      id: 4,
      navn: "Ola Nordmann",
      opprettetDato: "2026-03-20",
      oppdatertDato: "2026-03-20",
      kategori: "Ukjent kategori",
      misbrukstyper: [],
      ytelser: ["Dagpenger"],
      status: "Opprettet",
      ventestatus: null,
    });
  });
});
