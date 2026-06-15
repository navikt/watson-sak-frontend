import { describe, expect, it } from "vitest";
import {
  formaterDato,
  formaterRelativTid,
  formaterTilIsoDato,
  formaterÅrMåned,
  forskjellIDager,
  lagIsoTidspunktFraNorskDatoTid,
} from "./date-utils";

describe("formaterRelativTid", () => {
  const nå = new Date("2026-06-09T13:00:00+02:00");
  const sekunderSiden = (s: number) => new Date(nå.getTime() - s * 1000);

  it("viser «akkurat nå» for de første sekundene", () => {
    expect(formaterRelativTid(sekunderSiden(0), nå)).toBe("akkurat nå");
    expect(formaterRelativTid(sekunderSiden(4), nå)).toBe("akkurat nå");
  });

  it("viser «noen sekunder siden» mellom 5 og 59 sekunder", () => {
    expect(formaterRelativTid(sekunderSiden(32), nå)).toBe("for noen sekunder siden");
    expect(formaterRelativTid(sekunderSiden(59), nå)).toBe("for noen sekunder siden");
  });

  it("viser minutter", () => {
    expect(formaterRelativTid(sekunderSiden(5 * 60), nå)).toBe("for 5 minutter siden");
  });

  it("viser timer", () => {
    expect(formaterRelativTid(sekunderSiden(60 * 60), nå)).toBe("for 1 time siden");
  });

  it("viser dager for eldre tidspunkt", () => {
    expect(formaterRelativTid(sekunderSiden(3 * 24 * 60 * 60), nå)).toBe("for 3 døgn siden");
  });

  it("viser «i fremtiden» for tidspunkt fram i tid", () => {
    expect(formaterRelativTid(sekunderSiden(-3600), nå)).toBe("i fremtiden");
  });
});

describe("formaterÅrMåned", () => {
  it("formaterer gyldig år-måned streng", () => {
    expect(formaterÅrMåned("2025-01")).toBe("januar 2025");
    expect(formaterÅrMåned("2025-12")).toBe("desember 2025");
  });

  it("returnerer bindestrek for ugyldig input", () => {
    expect(formaterÅrMåned(null)).toBe("–");
    expect(formaterÅrMåned(undefined)).toBe("–");
    expect(formaterÅrMåned("ugyldig")).toBe("–");
    expect(formaterÅrMåned("2025-1")).toBe("–");
  });
});

describe("formaterDato", () => {
  it("formaterer ISO-dato til norsk format", () => {
    expect(formaterDato("2023-01-15")).toBe("15. jan. 2023");
    expect(formaterDato("2023-12-31")).toBe("31. des. 2023");
  });
});

describe("formaterTilIsoDato", () => {
  it("formaterer Date-objekt til ISO-streng", () => {
    const dato = new Date(2025, 0, 15); // 15. januar 2025
    expect(formaterTilIsoDato(dato)).toBe("2025-01-15");
  });
});

describe("lagIsoTidspunktFraNorskDatoTid", () => {
  it("tolker norsk vintertid som Europe/Oslo før lagring som UTC", () => {
    expect(lagIsoTidspunktFraNorskDatoTid("04.01.2026", "12:34")).toBe("2026-01-04T11:34:00.000Z");
  });

  it("tolker norsk sommertid som Europe/Oslo før lagring som UTC", () => {
    expect(lagIsoTidspunktFraNorskDatoTid("04.05.2026", "12:34")).toBe("2026-05-04T10:34:00.000Z");
  });
});

describe("forskjellIDager", () => {
  it("beregner forskjell mellom to datoer", () => {
    expect(forskjellIDager("2025-01-01", "2025-01-02")).toBe(1);
    expect(forskjellIDager("2025-01-01", "2025-01-10")).toBe(9);
  });

  it("håndterer Date-objekter", () => {
    expect(forskjellIDager(new Date("2025-01-01"), new Date("2025-01-05"))).toBe(4);
  });

  it("returnerer absolutt verdi uansett rekkefølge", () => {
    expect(forskjellIDager("2025-01-10", "2025-01-01")).toBe(9);
  });
});
