import { describe, expect, it } from "vitest";
import { RouteConfig } from "~/routeConfig";
import type { FordelingSak } from "~/fordeling/typer";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { mapFordelingSakTilSakslisteRad, mapKontrollsakTilSakslisteRad } from "./adaptere";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 201,
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
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
        enhet: "4812",
      },
    },
    status: "OPPRETTET",
    kategori: "SAMLIV",
    kilde: "PUBLIKUM",
    misbruktype: ["SKJULT_SAMLIV"],
    prioritet: "NORMAL",
    blokkert: null,
    ytelser: [
      {
        id: "ytelse-1",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
    ],
    merking: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
    ...overrides,
  };
}

function lagFordelingSak(overrides: Partial<FordelingSak> = {}): FordelingSak {
  return {
    id: 301,
    navn: "Kari Nordmann",
    opprettetDato: "2026-03-20",
    oppdatertDato: "2026-03-21",
    kategori: "Arbeid",
    misbrukstyper: ["Skjult samliv"],
    ytelser: ["Dagpenger"],
    status: { tekst: "Opprettet", variant: "info" },
    ...overrides,
  };
}

describe("sakslisteadaptere", () => {
  const kontrollsakId = "201";
  const fordelingSakId = "301";

  it("mapper kontrollsak til standard sakslisterad", () => {
    expect(mapKontrollsakTilSakslisteRad(lagKontrollsak())).toEqual({
      id: 201,
      saksreferanse: kontrollsakId,
      detaljHref: RouteConfig.SAKER_DETALJ.replace(":sakId", kontrollsakId),
      navn: "Ola Nordmann",
      kategori: "Samliv",
      misbrukstyper: ["Skjult samliv"],
      status: { tekst: "Opprettet", variant: "info" },
      saksbehandler: "Saks Behandler",
      opprettet: "2026-02-03T10:11:12Z",
      oppdatert: "2026-02-03T10:11:12Z",
    });
  });

  it("kan bruke egendefinert detaljsti for kontrollsak", () => {
    expect(mapKontrollsakTilSakslisteRad(lagKontrollsak(), "/mine-saker")).toMatchObject({
      detaljHref: `/mine-saker/${kontrollsakId}`,
    });
  });

  it("mapper fordeling-sak til standard sakslisterad", () => {
    expect(mapFordelingSakTilSakslisteRad(lagFordelingSak())).toEqual({
      id: 301,
      saksreferanse: fordelingSakId,
      detaljHref: RouteConfig.SAKER_DETALJ.replace(":sakId", fordelingSakId),
      navn: "Kari Nordmann",
      kategori: "Arbeid",
      misbrukstyper: ["Skjult samliv"],
      status: { tekst: "Opprettet", variant: "info" },
      saksbehandler: null,
      opprettet: "2026-03-20",
      oppdatert: "2026-03-21",
    });
  });

  it("kan bruke egendefinert detaljsti for fordeling-sak", () => {
    expect(mapFordelingSakTilSakslisteRad(lagFordelingSak(), "/fordeling/sak")).toMatchObject({
      detaljHref: `/fordeling/sak/${fordelingSakId}`,
    });
  });
});
