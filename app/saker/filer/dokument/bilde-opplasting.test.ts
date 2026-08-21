import { describe, expect, it } from "vitest";
import {
  filtrerBildefiler,
  MAKS_BILDESTØRRELSE_BYTES,
  TILLATTE_BILDETYPER,
  validerBildefil,
} from "./bilde-opplasting";

function lagFil(navn: string, type: string, størrelse = 1024): File {
  const fil = new File([new Uint8Array(størrelse)], navn, { type });
  return fil;
}

describe("validerBildefil", () => {
  it("godtar tillatte bildetyper", () => {
    for (const type of TILLATTE_BILDETYPER) {
      expect(validerBildefil(lagFil("bilde", type))).toBeNull();
    }
  });

  it("avviser filtyper som ikke er PNG eller JPEG", () => {
    expect(validerBildefil(lagFil("dokument.pdf", "application/pdf"))).toBe(
      "Bare PNG- og JPEG-bilder kan settes inn i dokumentet.",
    );
  });

  it("avviser WebP, som PDF-generatoren ikke kan rendre", () => {
    expect(validerBildefil(lagFil("bilde.webp", "image/webp"))).toBe(
      "Bare PNG- og JPEG-bilder kan settes inn i dokumentet.",
    );
  });

  it("avviser filer som er større enn maksgrensen", () => {
    const forStorFil = lagFil("stor.png", "image/png", MAKS_BILDESTØRRELSE_BYTES + 1);
    expect(validerBildefil(forStorFil)).toBe("Bildet er for stort. Maks størrelse er 10 MB.");
  });

  it("godtar filer akkurat på grensen", () => {
    const fil = lagFil("grense.png", "image/png", MAKS_BILDESTØRRELSE_BYTES);
    expect(validerBildefil(fil)).toBeNull();
  });
});

describe("filtrerBildefiler", () => {
  it("beholder kun filer som er bilder", () => {
    const bilde = lagFil("bilde.png", "image/png");
    const pdf = lagFil("dokument.pdf", "application/pdf");
    const tekst = lagFil("notat.txt", "text/plain");

    expect(filtrerBildefiler([bilde, pdf, tekst])).toEqual([bilde]);
  });

  it("returnerer tom liste når ingen filer er bilder", () => {
    const pdf = lagFil("dokument.pdf", "application/pdf");
    expect(filtrerBildefiler([pdf])).toEqual([]);
  });

  it("håndterer en tom liste", () => {
    expect(filtrerBildefiler([])).toEqual([]);
  });
});
