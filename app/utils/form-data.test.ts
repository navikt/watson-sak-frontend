import { describe, expect, it } from "vitest";
import { hentTekstfelt, hentValgfriTekst } from "./form-data";

function lagFormData(felt: string, verdi: string | undefined): FormData {
  const formData = new FormData();
  if (verdi !== undefined) {
    formData.set(felt, verdi);
  }
  return formData;
}

describe("hentTekstfelt", () => {
  it("returnerer verdien når feltet er satt", () => {
    const formData = lagFormData("navn", "Ola Nordmann");
    expect(hentTekstfelt(formData, "navn", "Mangler navn")).toBe("Ola Nordmann");
  });

  it("kaster 400 når feltet mangler", () => {
    const formData = new FormData();
    expect(() => hentTekstfelt(formData, "navn", "Mangler navn")).toThrow();
  });

  it("kaster 400 når feltet er tomt", () => {
    const formData = lagFormData("navn", "");
    expect(() => hentTekstfelt(formData, "navn", "Mangler navn")).toThrow();
  });

  it("kaster 400 når feltet kun er whitespace", () => {
    const formData = lagFormData("navn", "   ");
    expect(() => hentTekstfelt(formData, "navn", "Mangler navn")).toThrow();
  });
});

describe("hentValgfriTekst", () => {
  it("returnerer verdien når feltet er satt", () => {
    const formData = lagFormData("kommentar", "En kommentar");
    expect(hentValgfriTekst(formData, "kommentar")).toBe("En kommentar");
  });

  it("returnerer undefined når feltet mangler", () => {
    const formData = new FormData();
    expect(hentValgfriTekst(formData, "kommentar")).toBeUndefined();
  });

  it("returnerer undefined når feltet er tomt", () => {
    const formData = lagFormData("kommentar", "");
    expect(hentValgfriTekst(formData, "kommentar")).toBeUndefined();
  });

  it("returnerer undefined når feltet kun er whitespace", () => {
    const formData = lagFormData("kommentar", "   ");
    expect(hentValgfriTekst(formData, "kommentar")).toBeUndefined();
  });
});
