import { describe, expect, it } from "vitest";
import {
  formaterDato,
  formaterTilIsoDato,
  formaterÅrMåned,
  forskjellIDager,
} from "./date-utils";

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

describe("forskjellIDager", () => {
  it("beregner forskjell mellom to datoer", () => {
    expect(forskjellIDager("2025-01-01", "2025-01-02")).toBe(1);
    expect(forskjellIDager("2025-01-01", "2025-01-10")).toBe(9);
  });

  it("håndterer Date-objekter", () => {
    expect(
      forskjellIDager(new Date("2025-01-01"), new Date("2025-01-05")),
    ).toBe(4);
  });

  it("returnerer absolutt verdi uansett rekkefølge", () => {
    expect(forskjellIDager("2025-01-10", "2025-01-01")).toBe(9);
  });
});
