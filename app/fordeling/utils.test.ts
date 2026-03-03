import { describe, expect, it } from "vitest";
import type { Sak } from "./typer";
import { filtrerSaker, hentUnikeYtelser, sorterSakerEtterDato, søkISaker } from "./utils";

const lagSak = (id: string, datoInnmeldt: string): Sak => ({
  id,
  datoInnmeldt,
  kilde: "telefon",
  notat: "",
  fødselsnummer: "12345678901",
  ytelser: [],
  status: "tips mottatt",
  seksjon: "Seksjon A",
  tags: [],
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

describe("søkISaker", () => {
  const saker: Sak[] = [
    {
      ...lagSak("SAK-001", "2026-01-15"),
      notat: "Mistanke om svindel",
      fødselsnummer: "12345678901",
      ytelser: ["Dagpenger"],
      status: "tips mottatt",
      seksjon: "Seksjon A",
    },
    {
      ...lagSak("SAK-002", "2026-02-01"),
      notat: "Varslet av arbeidsgiver",
      fødselsnummer: "98765432100",
      ytelser: ["Sykepenger", "Arbeidsavklaringspenger"],
      status: "under utredning",
      seksjon: "Seksjon B",
    },
  ];

  it("returnerer alle saker ved tom søketekst", () => {
    expect(søkISaker(saker, "")).toHaveLength(2);
  });

  it("returnerer alle saker ved søketekst med kun mellomrom", () => {
    expect(søkISaker(saker, "   ")).toHaveLength(2);
  });

  it("søker case-insensitivt", () => {
    expect(søkISaker(saker, "SVINDEL").map((s) => s.id)).toEqual(["SAK-001"]);
    expect(søkISaker(saker, "svindel").map((s) => s.id)).toEqual(["SAK-001"]);
  });

  it("trimmer søketekst", () => {
    expect(søkISaker(saker, "  svindel  ").map((s) => s.id)).toEqual(["SAK-001"]);
  });

  it("matcher på id", () => {
    expect(søkISaker(saker, "SAK-002").map((s) => s.id)).toEqual(["SAK-002"]);
  });

  it("matcher på notat", () => {
    expect(søkISaker(saker, "arbeidsgiver").map((s) => s.id)).toEqual(["SAK-002"]);
  });

  it("matcher på fødselsnummer", () => {
    expect(søkISaker(saker, "98765432100").map((s) => s.id)).toEqual(["SAK-002"]);
  });

  it("matcher på ytelser", () => {
    expect(søkISaker(saker, "dagpenger").map((s) => s.id)).toEqual(["SAK-001"]);
    expect(søkISaker(saker, "arbeidsavklaringspenger").map((s) => s.id)).toEqual(["SAK-002"]);
  });

  it("matcher på status", () => {
    expect(søkISaker(saker, "under utredning").map((s) => s.id)).toEqual(["SAK-002"]);
  });

  it("matcher på seksjon", () => {
    expect(søkISaker(saker, "Seksjon B").map((s) => s.id)).toEqual(["SAK-002"]);
  });

  it("returnerer tom liste når ingenting matcher", () => {
    expect(søkISaker(saker, "finnes ikke")).toHaveLength(0);
  });
});
