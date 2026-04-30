import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Avslutningsdatoer } from "./mock-data.server";
import {
  beregnAntallIBero,
  beregnAntallPerSeksjon,
  beregnAntallPerStatus,
  beregnBehandlingstid,
  beregnFordelingPerAntallYtelser,
  beregnFordelingPerYtelse,
} from "./beregninger";

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "ks-1",
    personIdent: "12345678901",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "Seksjon A" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "Seksjon A" },
    },
    status: "OPPRETTET",
    kategori: "ANNET",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    blokkert: null,
    ytelser: [
      {
        id: "ytelse-1",
        type: "Dagpenger",
        periodeFra: "2025-01-01",
        periodeTil: "2025-01-31",
        belop: null,
      },
    ],
    merking: null,
    resultat: null,
    opprettet: "2025-01-01T00:00:00Z",
    oppdatert: null,
    ...overstyringer,
  };
}

function medEnhet(enhet: string): KontrollsakResponse["saksbehandlere"] {
  return {
    eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet },
    deltMed: [],
    opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet },
  };
}

function lagYtelse(id: string, type: string) {
  return {
    id,
    type,
    periodeFra: "2025-01-01",
    periodeTil: "2025-01-31",
    belop: null,
  };
}

describe("beregnAntallPerStatus", () => {
  test("teller riktig antall per status", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "OPPRETTET" }),
      lagKontrollsak({ id: "2", status: "OPPRETTET" }),
      lagKontrollsak({ id: "3", status: "UTREDES" }),
      lagKontrollsak({ id: "4", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "5", status: "AVSLUTTET" }),
    ];

    const resultat = beregnAntallPerStatus(saker);

    expect(resultat).toEqual({
      OPPRETTET: 2,
      UTREDES: 1,
      STRAFFERETTSLIG_VURDERING: 0,
      ANMELDT: 0,
      HENLAGT: 0,
      AVSLUTTET: 2,
    });
  });

  test("returnerer nuller for tom liste", () => {
    expect(beregnAntallPerStatus([])).toEqual({
      OPPRETTET: 0,
      UTREDES: 0,
      STRAFFERETTSLIG_VURDERING: 0,
      ANMELDT: 0,
      HENLAGT: 0,
      AVSLUTTET: 0,
    });
  });

  test("mapper backend-statuser direkte", () => {
    const resultat = beregnAntallPerStatus([
      lagKontrollsak({ id: "ks-1", status: "OPPRETTET" }),
      lagKontrollsak({ id: "ks-2", status: "UTREDES" }),
      lagKontrollsak({ id: "ks-3", status: "AVSLUTTET" }),
    ]);

    expect(resultat.OPPRETTET).toBe(1);
    expect(resultat.UTREDES).toBe(1);
    expect(resultat.AVSLUTTET).toBe(1);
  });

  test("teller saker i bero separat fra status", () => {
    expect(
      beregnAntallIBero([
        lagKontrollsak({ id: "1", status: "OPPRETTET", blokkert: "I_BERO" }),
        lagKontrollsak({ id: "2", status: "UTREDES", blokkert: "I_BERO" }),
        lagKontrollsak({ id: "3", status: "UTREDES" }),
      ]),
    ).toBe(2);
  });
});

describe("beregnBehandlingstid", () => {
  test("beregner riktig min, median, gjennomsnitt og maks", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
      lagKontrollsak({ id: "2", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
      lagKontrollsak({ id: "3", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2025-01-11",
      "2": "2025-01-21",
      "3": "2025-02-10",
    };

    expect(beregnBehandlingstid(saker, avslutningsdatoer)).toEqual({
      min: 10,
      median: 20,
      gjennomsnitt: 23,
      maks: 40,
      antall: 3,
    });
  });

  test("beregner median for partall antall saker", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
      lagKontrollsak({ id: "2", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2025-01-11",
      "2": "2025-01-21",
    };

    expect(beregnBehandlingstid(saker, avslutningsdatoer)?.median).toBe(15);
  });

  test("inkluderer avsluttede saker", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2025-01-15",
    };

    expect(beregnBehandlingstid(saker, avslutningsdatoer)).toEqual({
      min: 14,
      median: 14,
      gjennomsnitt: 14,
      maks: 14,
      antall: 1,
    });
  });

  test("ignorerer saker som ikke er avsluttet", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "UTREDES", opprettet: "2025-01-01T00:00:00Z" }),
      lagKontrollsak({ id: "2", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "2": "2025-01-31",
    };

    const resultat = beregnBehandlingstid(saker, avslutningsdatoer);

    expect(resultat?.antall).toBe(1);
    expect(resultat?.min).toBe(30);
  });

  test("returnerer null for tom liste", () => {
    expect(beregnBehandlingstid([], {})).toBeNull();
  });

  test("returnerer null når ingen saker er avsluttet", () => {
    expect(beregnBehandlingstid([lagKontrollsak({ id: "1", status: "UTREDES" })], {})).toBeNull();
  });

  test("bruker backend opprettet-felt for kontrollsaker", () => {
    const saker = [
      lagKontrollsak({ id: "ks-1", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "ks-1": "2025-01-11",
    };

    expect(beregnBehandlingstid(saker, avslutningsdatoer)?.gjennomsnitt).toBe(10);
  });
});

describe("beregnAntallPerSeksjon", () => {
  test("grupperer riktig etter seksjon og sorterer synkende", () => {
    const saker = [
      lagKontrollsak({ id: "1", saksbehandlere: medEnhet("Seksjon A") }),
      lagKontrollsak({ id: "2", saksbehandlere: medEnhet("Seksjon A") }),
      lagKontrollsak({ id: "3", saksbehandlere: medEnhet("Seksjon B") }),
      lagKontrollsak({ id: "4", saksbehandlere: medEnhet("Seksjon C") }),
      lagKontrollsak({ id: "5", saksbehandlere: medEnhet("Seksjon C") }),
      lagKontrollsak({ id: "6", saksbehandlere: medEnhet("Seksjon C") }),
    ];

    expect(beregnAntallPerSeksjon(saker)).toEqual([
      { navn: "Seksjon C", antall: 3 },
      { navn: "Seksjon A", antall: 2 },
      { navn: "Seksjon B", antall: 1 },
    ]);
  });

  test("returnerer tom liste for tom input", () => {
    expect(beregnAntallPerSeksjon([])).toEqual([]);
  });

  test("grupperer backend-saker på mottaksenhet", () => {
    expect(
      beregnAntallPerSeksjon([
        lagKontrollsak({ id: "ks-1", saksbehandlere: medEnhet("4812") }),
        lagKontrollsak({ id: "ks-2", saksbehandlere: medEnhet("4812") }),
        lagKontrollsak({ id: "ks-3", saksbehandlere: medEnhet("4813") }),
      ]),
    ).toEqual([
      { navn: "4812", antall: 2 },
      { navn: "4813", antall: 1 },
    ]);
  });
});

describe("beregnFordelingPerYtelse", () => {
  test("teller ytelser på tvers av saker", () => {
    const saker = [
      lagKontrollsak({ id: "1", ytelser: [lagYtelse("y1", "Dagpenger")] }),
      lagKontrollsak({
        id: "2",
        ytelser: [lagYtelse("y2", "Dagpenger"), lagYtelse("y3", "Sykepenger")],
      }),
      lagKontrollsak({ id: "3", ytelser: [lagYtelse("y4", "Sykepenger")] }),
    ];

    expect(beregnFordelingPerYtelse(saker)).toEqual([
      { navn: "Dagpenger", antall: 2 },
      { navn: "Sykepenger", antall: 2 },
    ]);
  });

  test("sorterer synkende etter antall", () => {
    const saker = [
      lagKontrollsak({ id: "1", ytelser: [lagYtelse("y1", "Dagpenger")] }),
      lagKontrollsak({ id: "2", ytelser: [lagYtelse("y2", "Sykepenger")] }),
      lagKontrollsak({ id: "3", ytelser: [lagYtelse("y3", "Sykepenger")] }),
      lagKontrollsak({ id: "4", ytelser: [lagYtelse("y4", "Sykepenger")] }),
    ];

    const resultat = beregnFordelingPerYtelse(saker);

    expect(resultat[0]).toEqual({ navn: "Sykepenger", antall: 3 });
    expect(resultat[1]).toEqual({ navn: "Dagpenger", antall: 1 });
  });

  test("returnerer tom liste for tom input", () => {
    expect(beregnFordelingPerYtelse([])).toEqual([]);
  });

  test("teller backend-ytelser fra objekter", () => {
    const resultat = beregnFordelingPerYtelse([
      lagKontrollsak({ id: "ks-1", ytelser: [lagYtelse("y1", "Dagpenger")] }),
      lagKontrollsak({ id: "ks-2", ytelser: [lagYtelse("y2", "Sykepenger")] }),
      lagKontrollsak({ id: "ks-3", ytelser: [lagYtelse("y3", "Sykepenger")] }),
    ]);

    expect(resultat[0]).toEqual({ navn: "Sykepenger", antall: 2 });
    expect(resultat[1]).toEqual({ navn: "Dagpenger", antall: 1 });
  });
});

describe("beregnFordelingPerAntallYtelser", () => {
  test("grupperer saker etter antall ytelser", () => {
    const saker = [
      lagKontrollsak({ id: "1", ytelser: [lagYtelse("y1", "Dagpenger")] }),
      lagKontrollsak({ id: "2", ytelser: [lagYtelse("y2", "Dagpenger")] }),
      lagKontrollsak({
        id: "3",
        ytelser: [lagYtelse("y3", "Dagpenger"), lagYtelse("y4", "Sykepenger")],
      }),
      lagKontrollsak({
        id: "4",
        ytelser: [
          lagYtelse("y5", "Dagpenger"),
          lagYtelse("y6", "Sykepenger"),
          lagYtelse("y7", "Foreldrepenger"),
        ],
      }),
    ];

    expect(beregnFordelingPerAntallYtelser(saker)).toEqual([
      { navn: "1 ytelse", antall: 2 },
      { navn: "2 ytelser", antall: 1 },
      { navn: "3 ytelser", antall: 1 },
    ]);
  });

  test("sorterer stigende etter antall ytelser", () => {
    const saker = [
      lagKontrollsak({
        id: "1",
        ytelser: [lagYtelse("y1", "A"), lagYtelse("y2", "B"), lagYtelse("y3", "C")],
      }),
      lagKontrollsak({ id: "2", ytelser: [lagYtelse("y4", "A")] }),
    ];

    const resultat = beregnFordelingPerAntallYtelser(saker);

    expect(resultat[0].navn).toBe("1 ytelse");
    expect(resultat[1].navn).toBe("3 ytelser");
  });

  test("returnerer tom liste for tom input", () => {
    expect(beregnFordelingPerAntallYtelser([])).toEqual([]);
  });

  test("grupperer backend-saker etter antall ytelsesobjekter", () => {
    expect(
      beregnFordelingPerAntallYtelser([
        lagKontrollsak({ id: "ks-1", ytelser: [lagYtelse("y1", "Dagpenger")] }),
        lagKontrollsak({
          id: "ks-2",
          ytelser: [lagYtelse("y2", "Dagpenger"), lagYtelse("y3", "Sykepenger")],
        }),
      ]),
    ).toEqual([
      { navn: "1 ytelse", antall: 1 },
      { navn: "2 ytelser", antall: 1 },
    ]);
  });
});
