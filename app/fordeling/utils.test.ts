import { describe, expect, it } from "vitest";
import type { Sak } from "./typer";
import { filtrerSaker, hentUnikeYtelser, sorterSakerEtterDato } from "./utils";

const lagSak = (id: string, datoInnmeldt: string): Sak => ({
  id,
  datoInnmeldt,
  kilde: "telefon",
  notat: "",
  fødselsnummer: "12345678901",
  ytelser: [],
  status: "tips mottatt",
  seksjon: "Seksjon A",
});

describe("sorterSakerEtterDato", () => {
  const saker: Sak[] = [
    lagSak("1", "2026-01-15"),
    lagSak("2", "2026-02-01"),
    lagSak("3", "2026-01-20"),
  ];

  it("sorterer nyest først", () => {
    const resultat = sorterSakerEtterDato(saker, "nyest");
    expect(resultat.map((s) => s.id)).toEqual(["2", "3", "1"]);
  });

  it("sorterer eldst først", () => {
    const resultat = sorterSakerEtterDato(saker, "eldst");
    expect(resultat.map((s) => s.id)).toEqual(["1", "3", "2"]);
  });

  it("muterer ikke originallisten", () => {
    const kopi = [...saker];
    sorterSakerEtterDato(saker, "nyest");
    expect(saker).toEqual(kopi);
  });
});

describe("filtrerSaker", () => {
  const saker: Sak[] = [
    {
      ...lagSak("1", "2026-01-15"),
      status: "tips mottatt",
      ytelser: ["Dagpenger"],
    },
    {
      ...lagSak("2", "2026-01-20"),
      status: "tips avklart",
      ytelser: ["Sykepenger", "Arbeidsavklaringspenger"],
    },
    {
      ...lagSak("3", "2026-02-01"),
      status: "under utredning",
      ytelser: ["Foreldrepenger"],
    },
    {
      ...lagSak("4", "2026-02-10"),
      status: "tips mottatt",
      ytelser: ["Dagpenger", "Sykepenger"],
    },
    {
      ...lagSak("5", "2026-02-18"),
      status: "avsluttet",
      ytelser: ["Pleiepenger"],
    },
  ];

  it("returnerer alle saker når ingen filtre er satt", () => {
    const resultat = filtrerSaker(saker, [], []);
    expect(resultat).toHaveLength(5);
  });

  it("filtrerer på én status", () => {
    const resultat = filtrerSaker(saker, ["tips mottatt"], []);
    expect(resultat.map((s) => s.id)).toEqual(["1", "4"]);
  });

  it("filtrerer på flere statuser", () => {
    const resultat = filtrerSaker(saker, ["tips mottatt", "avsluttet"], []);
    expect(resultat.map((s) => s.id)).toEqual(["1", "4", "5"]);
  });

  it("filtrerer på én ytelse", () => {
    const resultat = filtrerSaker(saker, [], ["Dagpenger"]);
    expect(resultat.map((s) => s.id)).toEqual(["1", "4"]);
  });

  it("filtrerer på flere ytelser", () => {
    const resultat = filtrerSaker(saker, [], ["Dagpenger", "Pleiepenger"]);
    expect(resultat.map((s) => s.id)).toEqual(["1", "4", "5"]);
  });

  it("kombinerer status og ytelse med AND", () => {
    const resultat = filtrerSaker(saker, ["tips mottatt"], ["Sykepenger"]);
    expect(resultat.map((s) => s.id)).toEqual(["4"]);
  });

  it("returnerer tom liste når ingen matcher", () => {
    const resultat = filtrerSaker(saker, ["avsluttet"], ["Dagpenger"]);
    expect(resultat).toHaveLength(0);
  });
});

describe("hentUnikeYtelser", () => {
  it("returnerer sorterte unike ytelser", () => {
    const saker: Sak[] = [
      { ...lagSak("1", "2026-01-15"), ytelser: ["Sykepenger", "Dagpenger"] },
      { ...lagSak("2", "2026-01-20"), ytelser: ["Dagpenger", "Pleiepenger"] },
    ];
    const resultat = hentUnikeYtelser(saker);
    expect(resultat).toEqual(["Dagpenger", "Pleiepenger", "Sykepenger"]);
  });

  it("returnerer tom liste for tom input", () => {
    expect(hentUnikeYtelser([])).toEqual([]);
  });
});
