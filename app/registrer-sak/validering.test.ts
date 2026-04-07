import { describe, expect, it } from "vitest";
import { opprettSakSchema } from "./validering";

const gyldigSkjema = {
  personIdent: "12345678901",
  ytelser: ["Dagpenger"],
  fraDato: "2026-01-01",
  tilDato: "2026-12-31",
  kategori: "DOKUMENTFALSK",
  kilde: "INTERN",
  enhet: "ØST",
};

describe("opprettSakSchema", () => {
  it("godtar gyldig skjemadata", () => {
    const resultat = opprettSakSchema.safeParse(gyldigSkjema);
    expect(resultat.success).toBe(true);
  });

  it("krever personident med 11 siffer", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      personIdent: "123",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.flatten().fieldErrors.personIdent).toBeDefined();
    }
  });

  it("krever minst én ytelse", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      ytelser: [],
    });
    expect(resultat.success).toBe(false);
  });

  it("krever gyldig kilde", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      kilde: "telefon",
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar INTERN, EKSTERN, ANONYM_TIPS og PUBLIKUM som kilde", () => {
    for (const kilde of ["INTERN", "EKSTERN", "ANONYM_TIPS", "PUBLIKUM"]) {
      const resultat = opprettSakSchema.safeParse({ ...gyldigSkjema, kilde });
      expect(resultat.success).toBe(true);
    }
  });

  it("krever kategori", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar alle gyldige kategorier", () => {
    for (const kategori of [
      "BEHANDLER",
      "ARBEID",
      "SAMLIV",
      "UTLAND",
      "IDENTITET",
      "TILTAK",
      "DOKUMENTFALSK",
      "ANNET",
    ]) {
      const resultat = opprettSakSchema.safeParse({
        ...gyldigSkjema,
        kategori,
        misbruktype:
          kategori in { BEHANDLER: 1, ARBEID: 1, SAMLIV: 1, UTLAND: 1, IDENTITET: 1, TILTAK: 1 }
            ? "testtype"
            : undefined,
      });
      expect(resultat.success).toBe(true);
    }
  });

  it("krever misbruktype når kategori har tilknyttede misbrukstyper", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: "SAMLIV",
      misbruktype: undefined,
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      const feil = resultat.error.flatten();
      expect(feil.fieldErrors.misbruktype ?? feil.formErrors).toBeTruthy();
    }
  });

  it("godtar skjema uten misbruktype for DOKUMENTFALSK", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: "DOKUMENTFALSK",
    });
    expect(resultat.success).toBe(true);
  });

  it("krever enhet", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      enhet: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("krever fra dato", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("krever til dato", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      tilDato: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("avviser ugyldige datoer", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: "ikke-en-dato",
    });
    expect(resultat.success).toBe(false);
  });

  it("normaliserer datoer skrevet som dd.mm.åååå", () => {
    const resultat = opprettSakSchema.safeParse({
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
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: "2026-12-31",
      tilDato: "2026-01-01",
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar caBeløp som valgfritt tall", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      caBeløp: 300000,
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.caBeløp).toBe(300000);
    }
  });

  it("godtar skjema uten caBeløp", () => {
    const resultat = opprettSakSchema.safeParse(gyldigSkjema);
    expect(resultat.success).toBe(true);
  });

  it("godtar organisasjonsnummer med 9 siffer", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      organisasjonsnummer: "123456789",
    });
    expect(resultat.success).toBe(true);
  });

  it("avviser ugyldig organisasjonsnummer", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      organisasjonsnummer: "1234",
    });
    expect(resultat.success).toBe(false);
  });
});
