import { describe, expect, it } from "vitest";
import { registrerSakSchema } from "./validering";

const gyldigSkjema = {
  personIdent: "12345678901",
  ytelser: ["Dagpenger"],
  fraDato: "2026-01-01",
  tilDato: "2026-12-31",
  kategori: "UDEFINERT",
  prioritet: "HØY",
  kilde: "INTERN",
  bakgrunn: "En backend-kompatibel beskrivelse av saken",
  avsenderNavn: "Tipser Testesen",
  avsenderTelefon: "12345678",
  avsenderAdresse: "Testveien 1",
  avsenderAnonym: false,
};

describe("registrerSakSchema", () => {
  it("godtar gyldig skjemadata i backend-format", () => {
    const resultat = registrerSakSchema.safeParse(gyldigSkjema);
    expect(resultat.success).toBe(true);
  });

  it("krever personident med 11 siffer", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      personIdent: "123",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.flatten().fieldErrors.personIdent).toBeDefined();
    }
  });

  it("krever minst én ytelse", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      ytelser: [],
    });
    expect(resultat.success).toBe(false);
  });

  it("krever gyldig backend-kilde", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      kilde: "telefon",
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar kun INTERN, EKSTERN og ANONYM_TIPS som kilde", () => {
    for (const kilde of ["INTERN", "EKSTERN", "ANONYM_TIPS"]) {
      const resultat = registrerSakSchema.safeParse({
        ...gyldigSkjema,
        kilde,
      });
      expect(resultat.success).toBe(true);
    }
  });

  it("krever kategori", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("viser UDEFINERT som gyldig kategori", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: "UDEFINERT",
    });
    expect(resultat.success).toBe(true);
  });

  it("krever prioritet", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      prioritet: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("krever bakgrunnsinnhold", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      bakgrunn: "",
    });
    expect(resultat.success).toBe(false);
  });

  it("krever felles datoer for alle valgte ytelser", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("avviser ugyldige datoer", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: "ikke-en-dato",
    });
    expect(resultat.success).toBe(false);
  });

  it("normaliserer datoer skrevet som dd.mm.åååå", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: "01.01.2026",
      tilDato: "31.12.2026",
    });

    expect(resultat.success).toBe(true);

    if (resultat.success) {
      expect(resultat.data.fraDato).toBe("2026-01-01");
      expect(resultat.data.tilDato).toBe("2026-12-31");
    }
  });

  it("avviser når til dato er før fra dato", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: "2026-12-31",
      tilDato: "2026-01-01",
    });

    expect(resultat.success).toBe(false);
  });

  it("setter avsenderAnonym til false som default", () => {
    const { avsenderAnonym: _avsenderAnonym, ...utenAnonym } = gyldigSkjema;
    const resultat = registrerSakSchema.safeParse(utenAnonym);
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.avsenderAnonym).toBe(false);
    }
  });
});
