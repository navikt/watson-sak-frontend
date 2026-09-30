import { describe, expect, it } from "vitest";
import { fargeForKode } from "./farger";

describe("fargeForKode", () => {
  it("gir kjente statistikkserier ulike Aksel-farger", () => {
    const farger = [
      fargeForKode("SAMLIV"),
      fargeForKode("ARBEID"),
      fargeForKode("UTLAND"),
      fargeForKode("IDENTITET"),
      fargeForKode("TILTAK"),
      fargeForKode("DOKUMENTFALSK"),
      fargeForKode("ANNET"),
      fargeForKode("BEHANDLER"),
    ];

    expect(new Set(farger).size).toBe(farger.length);
  });

  it("normaliserer tankestrek i aldersbøtter", () => {
    expect(fargeForKode("12–24")).toBe(fargeForKode("12-24"));
  });

  it("gir stabile farger også for ukjente koder", () => {
    expect(fargeForKode("NY_KATEGORI")).toBe(fargeForKode("NY_KATEGORI"));
  });
});
