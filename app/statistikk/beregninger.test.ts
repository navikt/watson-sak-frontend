import { describe, expect, test } from "vitest";
import type { Sak } from "~/saker/typer";
import type { Avslutningsdatoer } from "./mock-data.server";
import {
  beregnAntallPerSeksjon,
  beregnAntallPerStatus,
  beregnBehandlingstid,
  beregnFordelingPerAntallYtelser,
  beregnFordelingPerYtelse,
} from "./beregninger";

function lagSak(overstyringer: Partial<Sak> = {}): Sak {
  return {
    id: "test-1",
    datoInnmeldt: "2025-01-01",
    kilde: "telefon",
    notat: "Testnotat",
    fødselsnummer: "12345678901",
    ytelser: ["Dagpenger"],
    status: "tips mottatt",
    seksjon: "Seksjon A",
    tags: [],
    ...overstyringer,
  };
}

describe("beregnAntallPerStatus", () => {
  test("teller riktig antall per status", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "tips mottatt" }),
      lagSak({ id: "2", status: "tips mottatt" }),
      lagSak({ id: "3", status: "under utredning" }),
      lagSak({ id: "4", status: "avsluttet" }),
      lagSak({ id: "5", status: "henlagt" }),
    ];

    const resultat = beregnAntallPerStatus(saker);

    expect(resultat).toEqual({
      "tips mottatt": 2,
      "tips avklart": 0,
      "under utredning": 1,
      avsluttet: 1,
      henlagt: 1,
    });
  });

  test("returnerer nuller for tom liste", () => {
    const resultat = beregnAntallPerStatus([]);

    expect(resultat).toEqual({
      "tips mottatt": 0,
      "tips avklart": 0,
      "under utredning": 0,
      avsluttet: 0,
      henlagt: 0,
    });
  });
});

describe("beregnBehandlingstid", () => {
  test("beregner riktig min, median, gjennomsnitt og maks", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "avsluttet", datoInnmeldt: "2025-01-01" }),
      lagSak({ id: "2", status: "avsluttet", datoInnmeldt: "2025-01-01" }),
      lagSak({ id: "3", status: "avsluttet", datoInnmeldt: "2025-01-01" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2025-01-11", // 10 dager
      "2": "2025-01-21", // 20 dager
      "3": "2025-02-10", // 40 dager
    };

    const resultat = beregnBehandlingstid(saker, avslutningsdatoer);

    expect(resultat).toEqual({
      min: 10,
      median: 20,
      gjennomsnitt: 23,
      maks: 40,
      antall: 3,
    });
  });

  test("beregner median for partall antall saker", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "avsluttet", datoInnmeldt: "2025-01-01" }),
      lagSak({ id: "2", status: "avsluttet", datoInnmeldt: "2025-01-01" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2025-01-11", // 10 dager
      "2": "2025-01-21", // 20 dager
    };

    const resultat = beregnBehandlingstid(saker, avslutningsdatoer);

    expect(resultat?.median).toBe(15);
  });

  test("inkluderer henlagte saker", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "henlagt", datoInnmeldt: "2025-01-01" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2025-01-15", // 14 dager
    };

    const resultat = beregnBehandlingstid(saker, avslutningsdatoer);

    expect(resultat).toEqual({
      min: 14,
      median: 14,
      gjennomsnitt: 14,
      maks: 14,
      antall: 1,
    });
  });

  test("ignorerer saker som ikke er avsluttet/henlagt", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "under utredning", datoInnmeldt: "2025-01-01" }),
      lagSak({ id: "2", status: "avsluttet", datoInnmeldt: "2025-01-01" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "2": "2025-01-31", // 30 dager
    };

    const resultat = beregnBehandlingstid(saker, avslutningsdatoer);

    expect(resultat?.antall).toBe(1);
    expect(resultat?.min).toBe(30);
  });

  test("returnerer null for tom liste", () => {
    expect(beregnBehandlingstid([], {})).toBeNull();
  });

  test("returnerer null når ingen saker er avsluttet", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "under utredning" }),
    ];
    expect(beregnBehandlingstid(saker, {})).toBeNull();
  });
});

describe("beregnAntallPerSeksjon", () => {
  test("grupperer riktig etter seksjon og sorterer synkende", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", seksjon: "Seksjon A" }),
      lagSak({ id: "2", seksjon: "Seksjon A" }),
      lagSak({ id: "3", seksjon: "Seksjon B" }),
      lagSak({ id: "4", seksjon: "Seksjon C" }),
      lagSak({ id: "5", seksjon: "Seksjon C" }),
      lagSak({ id: "6", seksjon: "Seksjon C" }),
    ];

    const resultat = beregnAntallPerSeksjon(saker);

    expect(resultat).toEqual([
      { navn: "Seksjon C", antall: 3 },
      { navn: "Seksjon A", antall: 2 },
      { navn: "Seksjon B", antall: 1 },
    ]);
  });

  test("returnerer tom liste for tom input", () => {
    expect(beregnAntallPerSeksjon([])).toEqual([]);
  });
});

describe("beregnFordelingPerYtelse", () => {
  test("teller ytelser på tvers av saker", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", ytelser: ["Dagpenger"] }),
      lagSak({ id: "2", ytelser: ["Dagpenger", "Sykepenger"] }),
      lagSak({ id: "3", ytelser: ["Sykepenger"] }),
    ];

    const resultat = beregnFordelingPerYtelse(saker);

    expect(resultat).toEqual([
      { navn: "Dagpenger", antall: 2 },
      { navn: "Sykepenger", antall: 2 },
    ]);
  });

  test("sorterer synkende etter antall", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", ytelser: ["Dagpenger"] }),
      lagSak({ id: "2", ytelser: ["Sykepenger"] }),
      lagSak({ id: "3", ytelser: ["Sykepenger"] }),
      lagSak({ id: "4", ytelser: ["Sykepenger"] }),
    ];

    const resultat = beregnFordelingPerYtelse(saker);

    expect(resultat[0]).toEqual({ navn: "Sykepenger", antall: 3 });
    expect(resultat[1]).toEqual({ navn: "Dagpenger", antall: 1 });
  });

  test("returnerer tom liste for tom input", () => {
    expect(beregnFordelingPerYtelse([])).toEqual([]);
  });
});

describe("beregnFordelingPerAntallYtelser", () => {
  test("grupperer saker etter antall ytelser", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", ytelser: ["Dagpenger"] }),
      lagSak({ id: "2", ytelser: ["Dagpenger"] }),
      lagSak({ id: "3", ytelser: ["Dagpenger", "Sykepenger"] }),
      lagSak({ id: "4", ytelser: ["Dagpenger", "Sykepenger", "Foreldrepenger"] }),
    ];

    const resultat = beregnFordelingPerAntallYtelser(saker);

    expect(resultat).toEqual([
      { navn: "1 ytelse", antall: 2 },
      { navn: "2 ytelser", antall: 1 },
      { navn: "3 ytelser", antall: 1 },
    ]);
  });

  test("sorterer stigende etter antall ytelser", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", ytelser: ["A", "B", "C"] }),
      lagSak({ id: "2", ytelser: ["A"] }),
    ];

    const resultat = beregnFordelingPerAntallYtelser(saker);

    expect(resultat[0].navn).toBe("1 ytelse");
    expect(resultat[1].navn).toBe("3 ytelser");
  });

  test("returnerer tom liste for tom input", () => {
    expect(beregnFordelingPerAntallYtelser([])).toEqual([]);
  });
});
