import { describe, expect, it } from "vitest";
import {
  formaterBeløp,
  formaterDesimaltall,
  formaterProsent,
  konverterTilTall,
} from "./number-utils";

// Intl bruker non-breaking space (U+00A0) som tusenskilletegn
const nbsp = "\u00A0";

describe("formaterDesimaltall", () => {
  it("formaterer tall med to desimaler som standard", () => {
    expect(formaterDesimaltall(1234.5)).toBe(`1${nbsp}234,50`);
    expect(formaterDesimaltall(1234.56)).toBe(`1${nbsp}234,56`);
    expect(formaterDesimaltall(1234)).toBe(`1${nbsp}234,00`);
  });

  it("respekterer minimumFractionDigits", () => {
    expect(formaterDesimaltall(1234.5, 0)).toBe(`1${nbsp}234,5`);
    expect(formaterDesimaltall(1234, 0)).toBe(`1${nbsp}234`);
    // minimumFractionDigits må være <= maximumFractionDigits
    expect(formaterDesimaltall(1234.5, 3, 3)).toBe(`1${nbsp}234,500`);
  });

  it("respekterer maximumFractionDigits", () => {
    expect(formaterDesimaltall(1234.5678, 2, 2)).toBe(`1${nbsp}234,57`);
    expect(formaterDesimaltall(1234.5678, 2, 4)).toBe(`1${nbsp}234,5678`);
    expect(formaterDesimaltall(1234.5, 0, 0)).toBe(`1${nbsp}235`);
  });

  it("kaster feil hvis minimumFractionDigits > maximumFractionDigits", () => {
    expect(() => formaterDesimaltall(1234, 3, 2)).toThrow(RangeError);
    expect(() => formaterDesimaltall(1234, 3, 2)).toThrow(
      "minimumFractionDigits (3) kan ikke være større enn maximumFractionDigits (2)",
    );
  });

  it("håndterer null og negative tall", () => {
    expect(formaterDesimaltall(0)).toBe("0,00");
    expect(formaterDesimaltall(-1234.56)).toBe(`−1${nbsp}234,56`);
  });

  it("håndterer store tall", () => {
    expect(formaterDesimaltall(1234567.89)).toBe(`1${nbsp}234${nbsp}567,89`);
  });
});

describe("formaterProsent", () => {
  it("formaterer tall som prosent (input mellom 0-100)", () => {
    expect(formaterProsent(50)).toBe(`50${nbsp}%`);
    expect(formaterProsent(100)).toBe(`100${nbsp}%`);
    expect(formaterProsent(0)).toBe(`0${nbsp}%`);
  });

  it("formaterer desimaler korrekt", () => {
    expect(formaterProsent(33.33)).toBe(`33,33${nbsp}%`);
    expect(formaterProsent(66.666)).toBe(`66,67${nbsp}%`);
  });

  it("håndterer verdier over 100", () => {
    expect(formaterProsent(150)).toBe(`150${nbsp}%`);
  });

  it("returnerer input uendret for ikke-tall", () => {
    expect(formaterProsent("ikke et tall")).toBe("ikke et tall");
    expect(formaterProsent(null)).toBe(null);
    expect(formaterProsent(undefined)).toBe(undefined);
  });
});

describe("formaterBeløp", () => {
  it("formaterer tall som norsk valuta", () => {
    expect(formaterBeløp(1234)).toBe(`1${nbsp}234,00${nbsp}kr`);
    expect(formaterBeløp(1234.56)).toBe(`1${nbsp}234,56${nbsp}kr`);
  });

  it("respekterer maximumFractionDigits", () => {
    expect(formaterBeløp(1234.5678, 2)).toBe(`1${nbsp}234,57${nbsp}kr`);
    expect(formaterBeløp(1234.5678, 0)).toBe(`1${nbsp}235${nbsp}kr`);
    expect(formaterBeløp(1234, 0)).toBe(`1${nbsp}234${nbsp}kr`);
  });

  it("håndterer null og negative beløp", () => {
    expect(formaterBeløp(0)).toBe(`0,00${nbsp}kr`);
    expect(formaterBeløp(-500)).toBe(`−500,00${nbsp}kr`);
  });

  it("håndterer store beløp", () => {
    expect(formaterBeløp(1000000)).toBe(`1${nbsp}000${nbsp}000,00${nbsp}kr`);
  });

  it("returnerer input uendret for ikke-tall", () => {
    expect(formaterBeløp("ikke et tall")).toBe("ikke et tall");
    expect(formaterBeløp(null)).toBe(null);
    expect(formaterBeløp(undefined)).toBe(undefined);
  });
});

describe("konverterTilTall", () => {
  it("returnerer tallet direkte for number input", () => {
    expect(konverterTilTall(42)).toBe(42);
    expect(konverterTilTall(3.14)).toBe(3.14);
    expect(konverterTilTall(-10)).toBe(-10);
    expect(konverterTilTall(0)).toBe(0);
  });

  it("konverterer streng til tall", () => {
    expect(konverterTilTall("42")).toBe(42);
    expect(konverterTilTall("3.14")).toBe(3.14);
    expect(konverterTilTall("-10")).toBe(-10);
  });

  it("håndterer norsk desimalformat med komma", () => {
    expect(konverterTilTall("3,14")).toBe(3.14);
    expect(konverterTilTall("1234,56")).toBe(1234.56);
  });

  it("returnerer null for null, undefined og tom streng", () => {
    expect(konverterTilTall(null)).toBe(null);
    expect(konverterTilTall(undefined)).toBe(null);
    expect(konverterTilTall("")).toBe(null);
  });

  it("returnerer null for ikke-numeriske strenger", () => {
    expect(konverterTilTall("ikke et tall")).toBe(null);
    expect(konverterTilTall("abc123")).toBe(null);
  });

  it("returnerer null for Infinity og NaN", () => {
    expect(konverterTilTall(Infinity)).toBe(null);
    expect(konverterTilTall(-Infinity)).toBe(null);
    expect(konverterTilTall(NaN)).toBe(null);
  });
});
