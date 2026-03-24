import { describe, expect, it } from "vitest";
import type { Sak } from "~/saker/typer";
import {
  filtrerUfordelteSaker,
  hentUfordelteFiltervalg,
  hentUfordelteSaker,
  lagUfordelteOppsummering,
  paginerElementer,
  sorterUfordelteSaker,
} from "./ufordelte-saker";

const lagSak = (overstyringer: Partial<Sak>): Sak => ({
  id: "1",
  datoInnmeldt: "2026-01-15",
  kilde: "telefon",
  notat: "",
  fødselsnummer: "12345678901",
  ytelser: ["Dagpenger"],
  status: "tips mottatt",
  seksjon: "Seksjon A",
  tags: [],
  ...overstyringer,
});

describe("ufordelte-saker", () => {
  it("velger bare saker i status tips mottatt og tips avklart", () => {
    const saker = [
      lagSak({ id: "1", status: "tips mottatt" }),
      lagSak({ id: "2", status: "tips avklart" }),
      lagSak({ id: "3", status: "under utredning" }),
      lagSak({ id: "4", status: "avsluttet" }),
      lagSak({ id: "5", status: "henlagt" }),
    ];

    expect(hentUfordelteSaker(saker).map((sak) => sak.id)).toEqual(["1", "2"]);
  });

  it("utleder alfabetisk sorterte filtervalg fra de ufordelte sakene", () => {
    const saker = [
      lagSak({ id: "1", kategori: "Utland", ytelser: ["Sykepenger"], status: "tips mottatt" }),
      lagSak({ id: "2", kategori: "Annet", ytelser: ["Barnetrygd"], status: "tips avklart" }),
      lagSak({ id: "3", kategori: "Arbeid", ytelser: ["Dagpenger"], status: "tips mottatt" }),
      lagSak({ id: "4", kategori: "Arbeid", ytelser: ["Barnetrygd"], status: "under utredning" }),
    ];

    expect(hentUfordelteFiltervalg(saker)).toEqual({
      kategorier: ["Annet", "Arbeid", "Utland"],
      ytelser: ["Barnetrygd", "Dagpenger", "Sykepenger"],
    });
  });

  it("filtrerer med kategori og ytelse og justerer ugyldig side ved paginering", () => {
    const saker = [
      lagSak({ id: "1", kategori: "Arbeid", ytelser: ["Dagpenger"], status: "tips mottatt" }),
      lagSak({ id: "2", kategori: "Arbeid", ytelser: ["AAP"], status: "tips mottatt" }),
      lagSak({ id: "3", kategori: "Arbeid", ytelser: ["Dagpenger"], status: "tips avklart" }),
      lagSak({ id: "4", kategori: "Utland", ytelser: ["Dagpenger"], status: "tips mottatt" }),
      lagSak({ id: "5", kategori: "Arbeid", ytelser: ["Dagpenger"], status: "under utredning" }),
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
        datoInnmeldt: "2026-01-13",
        kategori: "Samliv",
        ytelser: ["Barnetrygd"],
        status: "tips mottatt",
      }),
      lagSak({
        id: "2",
        datoInnmeldt: "2026-02-16",
        kategori: "Arbeid",
        ytelser: ["Dagpenger", "Barnetrygd"],
        status: "tips avklart",
      }),
      lagSak({
        id: "3",
        datoInnmeldt: "2026-02-18",
        kategori: "Arbeid",
        ytelser: ["Sykepenger"],
        status: "under utredning",
      }),
    ];

    expect(lagUfordelteOppsummering(saker, new Date("2026-03-23"))).toEqual({
      antallTekst: "2 ufordelte saker",
      eldsteTekst: "Eldste sak har ligget i 69 dager",
      ytelserTekst: "Gjelder ytelsene Barnetrygd og Dagpenger",
    });
  });

  it("sorterer ufordelte saker på valgt kolonne og retning", () => {
    const saker = [
      lagSak({
        id: "1",
        datoInnmeldt: "2026-01-13",
        kategori: "Utland",
        ytelser: ["Sykepenger"],
        status: "tips mottatt",
      }),
      lagSak({
        id: "2",
        datoInnmeldt: "2026-02-16",
        kategori: "Arbeid",
        ytelser: ["Barnetrygd"],
        status: "tips avklart",
      }),
      lagSak({
        id: "3",
        datoInnmeldt: "2026-01-20",
        kategori: "Samliv",
        ytelser: ["Dagpenger"],
        status: "tips mottatt",
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
