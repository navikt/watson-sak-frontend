import { describe, expect, it } from "vitest";
import { opprettSakSchema } from "./validering";

const gyldigSkjema = {
  personIdent: "12345678901",
  ytelser: ["Dagpenger"],
  fraDato: "2026-01-01",
  tilDato: "2026-12-31",
  kategori: "UDEFINERT",
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

  it("godtar INTERN, EKSTERN og ANONYM_TIPS som kilde", () => {
    for (const kilde of ["INTERN", "EKSTERN", "ANONYM_TIPS"]) {
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
    for (const kategori of ["UDEFINERT", "FEILUTBETALING", "MISBRUK", "OPPFOLGING"]) {
      const misbrukstypeForKategori: Record<string, string> = {
        FEILUTBETALING: "Hvit inntekt",
        MISBRUK: "Skjult samliv",
        OPPFOLGING: "Misbruk av tiltaksplass",
      };
      const resultat = opprettSakSchema.safeParse({
        ...gyldigSkjema,
        kategori,
        misbruktype: misbrukstypeForKategori[kategori],
      });
      expect(resultat.success).toBe(true);
    }
  });

  it("krever misbruktype når kategori har tilknyttede misbrukstyper", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: "MISBRUK",
      misbruktype: undefined,
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      const feil = resultat.error.flatten();
      expect(feil.fieldErrors.misbruktype ?? feil.formErrors).toBeTruthy();
    }
  });

  it("avviser misbruktype som ikke tilhører valgt kategori", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: "OPPFOLGING",
      misbruktype: "Svart arbeid",
    });

    expect(resultat.success).toBe(false);
  });

  it("godtar skjema uten misbruktype for UDEFINERT", () => {
    const resultat = opprettSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: "UDEFINERT",
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
