import { describe, expect, it } from "vitest";
import {
  filtrerUfordelteSaker,
  hentUfordelteFiltervalg,
  lagUfordelteOppsummering,
  paginerElementer,
  sorterUfordelteSaker,
} from "./ufordelte-saker";
import type { FordelingSak } from "./typer";

const lagSak = (overstyringer: Partial<FordelingSak>): FordelingSak => ({
  id: "1",
  navn: null,
  opprettetDato: "2026-01-15",
  oppdatertDato: "2026-01-15",
  kategori: "Arbeid",
  misbrukstyper: [],
  ytelser: ["Dagpenger"],
  status: { tekst: "Opprettet", variant: "info" },
  ...overstyringer,
});

describe("ufordelte-saker", () => {
  it("utleder alfabetisk sorterte filtervalg fra de ufordelte sakene", () => {
    const saker = [
      lagSak({ id: "1", kategori: "Tiltak", ytelser: ["Sykepenger"] }),
      lagSak({ id: "2", kategori: "Samliv", ytelser: ["Barnetrygd"] }),
      lagSak({ id: "3", kategori: "Arbeid", ytelser: ["Dagpenger"] }),
      lagSak({ id: "4", kategori: "Arbeid", ytelser: ["Barnetrygd"] }),
    ];

    expect(hentUfordelteFiltervalg(saker)).toEqual({
      kategorier: ["Arbeid", "Samliv", "Tiltak"],
      ytelser: ["Barnetrygd", "Dagpenger", "Sykepenger"],
    });
  });

  it("filtrerer med kategori og ytelse og justerer ugyldig side ved paginering", () => {
    const saker = [
      lagSak({ id: "1", kategori: "Arbeid", ytelser: ["Dagpenger"] }),
      lagSak({ id: "2", kategori: "Arbeid", ytelser: ["AAP"] }),
      lagSak({ id: "3", kategori: "Arbeid", ytelser: ["Dagpenger"] }),
      lagSak({ id: "4", kategori: "Tiltak", ytelser: ["Dagpenger"] }),
      lagSak({ id: "5", kategori: "Samliv", ytelser: ["Dagpenger"] }),
    ];

    const filtrerteSaker = filtrerUfordelteSaker(saker, {
      kategorier: ["Arbeid"],
      ytelser: ["Dagpenger"],
    });

    expect(filtrerteSaker.map((sak) => sak.id)).toEqual(["1", "3"]);

    expect(paginerElementer(filtrerteSaker, 5, 1)).toEqual({
      aktivSide: 2,
      totalSider: 2,
      elementer: [filtrerteSaker[1]],
    });
  });

  it("lager oppsummering med antall saker, eldste liggetid og relevante ytelser", () => {
    const saker = [
      lagSak({
        id: "1",
        opprettetDato: "2026-01-13",
        kategori: "Tiltak",
        ytelser: ["Barnetrygd"],
      }),
      lagSak({
        id: "2",
        opprettetDato: "2026-02-16",
        kategori: "Arbeid",
        ytelser: ["Dagpenger", "Barnetrygd"],
      }),
      lagSak({
        id: "3",
        opprettetDato: "2026-02-18",
        kategori: "Samliv",
        ytelser: ["Sykepenger"],
      }),
    ];

    expect(lagUfordelteOppsummering(saker, new Date("2026-03-23"))).toEqual({
      antallTekst: "3 ufordelte saker",
      eldsteTekst: "Eldste sak har ligget i 69 dager",
      ytelserTekst: "Gjelder ytelsene Barnetrygd, Dagpenger og Sykepenger",
    });
  });

  it("sorterer ufordelte saker på valgt kolonne og retning", () => {
    const saker = [
      lagSak({
        id: "00000000-0000-4000-8000-000000003000",
        opprettetDato: "2026-01-13",
        oppdatertDato: "2026-01-14",
        kategori: "Tiltak",
        ytelser: ["Sykepenger"],
        status: { tekst: "Utredes", variant: "warning" },
      }),
      lagSak({
        id: "00000000-0000-4000-8000-000000001000",
        opprettetDato: "2026-02-16",
        oppdatertDato: "2026-02-17",
        kategori: "Arbeid",
        ytelser: ["Barnetrygd"],
        status: { tekst: "Opprettet", variant: "info" },
      }),
      lagSak({
        id: "00000000-0000-4000-8000-000000002000",
        opprettetDato: "2026-01-20",
        oppdatertDato: "2026-01-21",
        kategori: "Samliv",
        ytelser: ["Dagpenger"],
        status: { tekst: "Avsluttet", variant: "neutral" },
      }),
    ];

    expect(sorterUfordelteSaker(saker, "kategori", "stigende").map((sak) => sak.id)).toEqual([
      saker[1].id,
      saker[2].id,
      saker[0].id,
    ]);
    expect(sorterUfordelteSaker(saker, "opprettet", "synkende").map((sak) => sak.id)).toEqual([
      saker[1].id,
      saker[2].id,
      saker[0].id,
    ]);
    expect(sorterUfordelteSaker(saker, "saksid", "stigende").map((sak) => sak.id)).toEqual([
      saker[1].id,
      saker[2].id,
      saker[0].id,
    ]);
    expect(sorterUfordelteSaker(saker, "saksid", "synkende").map((sak) => sak.id)).toEqual([
      saker[0].id,
      saker[2].id,
      saker[1].id,
    ]);
    expect(sorterUfordelteSaker(saker, "status", "stigende").map((sak) => sak.id)).toEqual([
      saker[2].id,
      saker[1].id,
      saker[0].id,
    ]);
    expect(sorterUfordelteSaker(saker, "oppdatert", "stigende").map((sak) => sak.id)).toEqual([
      saker[0].id,
      saker[2].id,
      saker[1].id,
    ]);
  });
});
