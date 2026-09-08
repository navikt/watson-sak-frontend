import { describe, expect, it } from "vitest";
import { hentFornavn, hentHilsen } from "./hilsen";

describe("hentHilsen", () => {
  it("gir god morgen tidlig på dagen", () => {
    expect(hentHilsen(new Date(2026, 0, 1, 7)).tekst).toBe("God morgen");
  });

  it("gir god dag midt på dagen", () => {
    expect(hentHilsen(new Date(2026, 0, 1, 12)).tekst).toBe("God dag");
  });

  it("gir god ettermiddag på ettermiddagen", () => {
    expect(hentHilsen(new Date(2026, 0, 1, 18)).tekst).toBe("God ettermiddag");
  });

  it("gir god kveld på kvelden", () => {
    expect(hentHilsen(new Date(2026, 0, 1, 21)).tekst).toBe("God kveld");
  });

  it("gir god natt på natten", () => {
    expect(hentHilsen(new Date(2026, 0, 1, 2)).tekst).toBe("God natt");
  });
});

describe("hentFornavn", () => {
  it("returnerer fornavnet fra et vanlig fullt navn", () => {
    expect(hentFornavn("Kari Nordmann")).toBe("Kari");
  });

  it("returnerer fornavnet fra 'Etternavn, Fornavn'-format", () => {
    expect(hentFornavn("Nordmann, Kari")).toBe("Kari");
  });

  it("håndterer navn med flere mellomnavn", () => {
    expect(hentFornavn("Kari Anne Nordmann")).toBe("Kari");
  });
});
