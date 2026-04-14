import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Avslutningsdatoer } from "./mock-data.server";
import {
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
    saksbehandler: "Z123456",
    status: "OPPRETTET",
    kategori: "ANNET",
    prioritet: "NORMAL",
    mottakEnhet: "Seksjon A",
    mottakSaksbehandler: "Z654321",
    ytelser: [
      {
        id: "ytelse-1",
        type: "Dagpenger",
        periodeFra: "2025-01-01",
        periodeTil: "2025-01-31",
      },
    ],
    bakgrunn: null,
    resultat: null,
    opprettet: "2025-01-01T00:00:00Z",
    oppdatert: null,
    ...overstyringer,
  };
}

describe("beregnAntallPerStatus", () => {
  test("teller riktig antall per status", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "OPPRETTET" }),
      lagKontrollsak({ id: "2", status: "OPPRETTET" }),
      lagKontrollsak({ id: "3", status: "UTREDES" }),
      lagKontrollsak({ id: "4", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "5", status: "HENLAGT" }),
    ];

    const resultat = beregnAntallPerStatus(saker);

    expect(resultat).toEqual({
      OPPRETTET: 2,
      AVKLART: 0,
      UTREDES: 1,
      I_BERO: 0,
      TIL_FORVALTNING: 0,
      AVSLUTTET: 1,
      HENLAGT: 1,
    });
  });

  test("returnerer nuller for tom liste", () => {
    const resultat = beregnAntallPerStatus([]);

    expect(resultat).toEqual({
      OPPRETTET: 0,
      AVKLART: 0,
      UTREDES: 0,
      I_BERO: 0,
      TIL_FORVALTNING: 0,
      AVSLUTTET: 0,
      HENLAGT: 0,
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
});

describe("beregnBehandlingstid", () => {
  test("beregner riktig min, median, gjennomsnitt og maks", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
      lagKontrollsak({ id: "2", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
      lagKontrollsak({ id: "3", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
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
    const saker = [
      lagKontrollsak({ id: "1", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
      lagKontrollsak({ id: "2", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2025-01-11", // 10 dager
      "2": "2025-01-21", // 20 dager
    };

    const resultat = beregnBehandlingstid(saker, avslutningsdatoer);

    expect(resultat?.median).toBe(15);
  });

  test("inkluderer henlagte saker", () => {
    const saker = [
      lagKontrollsak({ id: "1", status: "HENLAGT", opprettet: "2025-01-01T00:00:00Z" }),
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
    const saker = [
      lagKontrollsak({ id: "1", status: "UTREDES", opprettet: "2025-01-01T00:00:00Z" }),
      lagKontrollsak({ id: "2", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
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
    const saker = [lagKontrollsak({ id: "1", status: "UTREDES" })];
    expect(beregnBehandlingstid(saker, {})).toBeNull();
  });

  test("bruker backend opprettet-felt for kontrollsaker", () => {
    const saker = [
      lagKontrollsak({ id: "ks-1", status: "AVSLUTTET", opprettet: "2025-01-01T00:00:00Z" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "ks-1": "2025-01-11",
    };

    const resultat = beregnBehandlingstid(saker, avslutningsdatoer);

    expect(resultat?.gjennomsnitt).toBe(10);
  });
});

describe("beregnAntallPerSeksjon", () => {
  test("grupperer riktig etter seksjon og sorterer synkende", () => {
    const saker = [
      lagKontrollsak({ id: "1", mottakEnhet: "Seksjon A" }),
      lagKontrollsak({ id: "2", mottakEnhet: "Seksjon A" }),
      lagKontrollsak({ id: "3", mottakEnhet: "Seksjon B" }),
      lagKontrollsak({ id: "4", mottakEnhet: "Seksjon C" }),
      lagKontrollsak({ id: "5", mottakEnhet: "Seksjon C" }),
      lagKontrollsak({ id: "6", mottakEnhet: "Seksjon C" }),
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

  test("grupperer backend-saker på mottakEnhet", () => {
    const resultat = beregnAntallPerSeksjon([
      lagKontrollsak({ id: "ks-1", mottakEnhet: "4812" }),
      lagKontrollsak({ id: "ks-2", mottakEnhet: "4812" }),
      lagKontrollsak({ id: "ks-3", mottakEnhet: "4813" }),
    ]);

    expect(resultat).toEqual([
      { navn: "4812", antall: 2 },
      { navn: "4813", antall: 1 },
    ]);
  });
});

describe("beregnFordelingPerYtelse", () => {
  test("teller ytelser på tvers av saker", () => {
    const saker = [
      lagKontrollsak({
        id: "1",
        ytelser: [
          { id: "y1", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "2",
        ytelser: [
          { id: "y2", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
          { id: "y3", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "3",
        ytelser: [
          { id: "y4", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
    ];

    const resultat = beregnFordelingPerYtelse(saker);

    expect(resultat).toEqual([
      { navn: "Dagpenger", antall: 2 },
      { navn: "Sykepenger", antall: 2 },
    ]);
  });

  test("sorterer synkende etter antall", () => {
    const saker = [
      lagKontrollsak({
        id: "1",
        ytelser: [
          { id: "y1", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "2",
        ytelser: [
          { id: "y2", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "3",
        ytelser: [
          { id: "y3", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "4",
        ytelser: [
          { id: "y4", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
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
      lagKontrollsak({
        id: "ks-1",
        ytelser: [
          { id: "y1", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "ks-2",
        ytelser: [
          { id: "y2", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "ks-3",
        ytelser: [
          { id: "y3", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
    ]);

    expect(resultat[0]).toEqual({ navn: "Sykepenger", antall: 2 });
    expect(resultat[1]).toEqual({ navn: "Dagpenger", antall: 1 });
  });
});

describe("beregnFordelingPerAntallYtelser", () => {
  test("grupperer saker etter antall ytelser", () => {
    const saker = [
      lagKontrollsak({
        id: "1",
        ytelser: [
          { id: "y1", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "2",
        ytelser: [
          { id: "y2", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "3",
        ytelser: [
          { id: "y3", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
          { id: "y4", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "4",
        ytelser: [
          { id: "y5", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
          { id: "y6", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
          { id: "y7", type: "Foreldrepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
    ];

    const resultat = beregnFordelingPerAntallYtelser(saker);

    expect(resultat).toEqual([
      { navn: "1 ytelse", antall: 2 },
      { navn: "2 ytelser", antall: 1 },
      { navn: "3 ytelser", antall: 1 },
    ]);
  });

  test("sorterer stigende etter antall ytelser", () => {
    const saker = [
      lagKontrollsak({
        id: "1",
        ytelser: [
          { id: "y1", type: "A", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
          { id: "y2", type: "B", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
          { id: "y3", type: "C", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "2",
        ytelser: [{ id: "y4", type: "A", periodeFra: "2025-01-01", periodeTil: "2025-01-31" }],
      }),
    ];

    const resultat = beregnFordelingPerAntallYtelser(saker);

    expect(resultat[0].navn).toBe("1 ytelse");
    expect(resultat[1].navn).toBe("3 ytelser");
  });

  test("returnerer tom liste for tom input", () => {
    expect(beregnFordelingPerAntallYtelser([])).toEqual([]);
  });

  test("grupperer backend-saker etter antall ytelsesobjekter", () => {
    const resultat = beregnFordelingPerAntallYtelser([
      lagKontrollsak({
        id: "ks-1",
        ytelser: [
          { id: "y1", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
      lagKontrollsak({
        id: "ks-2",
        ytelser: [
          { id: "y2", type: "Dagpenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
          { id: "y3", type: "Sykepenger", periodeFra: "2025-01-01", periodeTil: "2025-01-31" },
        ],
      }),
    ]);

    expect(resultat).toEqual([
      { navn: "1 ytelse", antall: 1 },
      { navn: "2 ytelser", antall: 1 },
    ]);
  });
});
