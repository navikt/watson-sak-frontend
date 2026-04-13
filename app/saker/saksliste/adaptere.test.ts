import { describe, expect, it } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import { RouteConfig } from "~/routeConfig";
import type { FordelingSak } from "~/fordeling/typer";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { mapFordelingSakTilSakslisteRad, mapKontrollsakTilSakslisteRad } from "./adaptere";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakUuid("201", 2),
    personIdent: "10987654321",
    navn: "Ola Nordmann",
    saksbehandler: "Z123456",
    status: "OPPRETTET",
    kategori: "SAMLIV",
    prioritet: "NORMAL",
    mottakEnhet: "4812",
    mottakSaksbehandler: "Z654321",
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000020101",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
      },
    ],
    misbrukstyper: ["Skjult samliv"],
    bakgrunn: {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      kilde: "ANONYM_TIPS",
      innhold: "Tips om mulig feilutbetaling.",
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

function lagFordelingSak(overrides: Partial<FordelingSak> = {}): FordelingSak {
  return {
    id: lagMockSakUuid("301", 2),
    navn: "Kari Nordmann",
    opprettetDato: "2026-03-20",
    oppdatertDato: "2026-03-21",
    kategori: "Arbeid",
    misbrukstyper: ["Skjult samliv"],
    ytelser: ["Dagpenger"],
    ...overrides,
  };
}

describe("sakslisteadaptere", () => {
  it("mapper kontrollsak til standard sakslisterad", () => {
    expect(mapKontrollsakTilSakslisteRad(lagKontrollsak())).toEqual({
      id: lagMockSakUuid("201", 2),
      saksreferanse: "201",
      detaljHref: RouteConfig.SAKER_DETALJ.replace(":sakId", "201"),
      navn: "Ola Nordmann",
      kategori: "Samliv",
      misbrukstyper: ["Skjult samliv"],
      opprettet: "2026-02-03T10:11:12Z",
      oppdatert: "2026-02-03T10:11:12Z",
    });
  });

  it("kan bruke egendefinert detaljsti for kontrollsak", () => {
    expect(mapKontrollsakTilSakslisteRad(lagKontrollsak(), "/mine-saker")).toMatchObject({
      detaljHref: "/mine-saker/201",
    });
  });

  it("mapper fordeling-sak til standard sakslisterad", () => {
    expect(mapFordelingSakTilSakslisteRad(lagFordelingSak())).toEqual({
      id: lagMockSakUuid("301", 2),
      saksreferanse: "301",
      detaljHref: RouteConfig.SAKER_DETALJ.replace(":sakId", "301"),
      navn: "Kari Nordmann",
      kategori: "Arbeid",
      misbrukstyper: ["Skjult samliv"],
      opprettet: "2026-03-20",
      oppdatert: "2026-03-21",
    });
  });

  it("kan bruke egendefinert detaljsti for fordeling-sak", () => {
    expect(mapFordelingSakTilSakslisteRad(lagFordelingSak(), "/fordeling/sak")).toMatchObject({
      detaljHref: "/fordeling/sak/301",
    });
  });
});
