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
  opprettetDato: "2026-01-15",
  kategori: "Arbeid",
  ytelser: ["Dagpenger"],
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
        id: "1",
        opprettetDato: "2026-01-13",
        kategori: "Tiltak",
        ytelser: ["Sykepenger"],
      }),
      lagSak({
        id: "2",
        opprettetDato: "2026-02-16",
        kategori: "Arbeid",
        ytelser: ["Barnetrygd"],
      }),
      lagSak({
        id: "3",
        opprettetDato: "2026-01-20",
        kategori: "Samliv",
        ytelser: ["Dagpenger"],
      }),
    ];

    expect(sorterUfordelteSaker(saker, "kategori", "stigende").map((sak) => sak.id)).toEqual([
      "2",
      "3",
      "1",
    ]);
    expect(sorterUfordelteSaker(saker, "ytelse", "synkende").map((sak) => sak.id)).toEqual([
      "1",
      "3",
      "2",
    ]);
    expect(sorterUfordelteSaker(saker, "opprettet", "synkende").map((sak) => sak.id)).toEqual([
      "2",
      "3",
      "1",
    ]);
  });
});
