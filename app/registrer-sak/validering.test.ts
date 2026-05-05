import { describe, expect, it } from "vitest";
import { opprettSakSchema } from "./validering";

const minimaltGyldigSkjema = {
  personIdent: "12345678901",
  kategori: "DOKUMENTFALSK",
  kilde: "NAV_KONTROLL",
};

describe("opprettSakSchema", () => {
  it("godtar et minimalt skjema med kun påkrevde felter", () => {
    const resultat = opprettSakSchema.safeParse(minimaltGyldigSkjema);
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.ytelser).toEqual([]);
      expect(resultat.data.misbruktype).toEqual([]);
      expect(resultat.data.merking).toEqual([]);
    }
  });

  it("krever personident med 11 siffer", () => {
    const resultat = opprettSakSchema.safeParse({ ...minimaltGyldigSkjema, personIdent: "123" });
    expect(resultat.success).toBe(false);
  });

  it("krever kategori", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      kategori: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("krever kilde", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      kilde: undefined,
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar misbruktype som array", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      kategori: "UTLAND",
      misbruktype: ["INNENFOR_EOS", "UTENFOR_EOS"],
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.misbruktype).toEqual(["INNENFOR_EOS", "UTENFOR_EOS"]);
    }
  });

  it("avviser misbruktype som ikke tilhører valgt kategori", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      kategori: "SAMLIV",
      misbruktype: ["SVART_ARBEID"],
    });
    expect(resultat.success).toBe(false);
  });

  it("avviser misbruktype når kategorien ikke har egne misbrukstyper", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      kategori: "DOKUMENTFALSK",
      misbruktype: ["SVART_ARBEID"],
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar tom misbruktype-liste når kategorien ikke har egne misbrukstyper", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      kategori: "DOKUMENTFALSK",
      misbruktype: [],
    });
    expect(resultat.success).toBe(true);
  });

  it("godtar merking som array", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      merking: ["PRIORITERT", "SENSITIV"],
    });
    expect(resultat.success).toBe(true);
  });

  it("filtrerer bort tomme ytelse-rader", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      ytelser: [
        { type: "Dagpenger", fraDato: "2024-01-01", tilDato: "2024-12-31", beløp: 1000 },
        { type: undefined, fraDato: undefined, tilDato: undefined, beløp: undefined },
      ],
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.ytelser).toHaveLength(1);
      expect(resultat.data.ytelser[0]).toEqual({
        type: "Dagpenger",
        fraDato: "2024-01-01",
        tilDato: "2024-12-31",
        beløp: 1000,
      });
    }
  });

  it("godtar ytelse-rader hvor kun ett felt er fylt ut", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      ytelser: [{ type: "Dagpenger" }],
    });
    expect(resultat.success).toBe(true);
  });

  it("normaliserer datoer skrevet som dd.mm.åååå i ytelse-rad", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      ytelser: [{ fraDato: "01.01.2024", tilDato: "31.12.2024" }],
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.ytelser[0].fraDato).toBe("2024-01-01");
      expect(resultat.data.ytelser[0].tilDato).toBe("2024-12-31");
    }
  });

  it("avviser ugyldige datoer i ytelse-rad", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      ytelser: [{ fraDato: "ikke-en-dato" }],
    });
    expect(resultat.success).toBe(false);
  });

  it("avviser når til-dato er før fra-dato i samme rad", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      ytelser: [{ fraDato: "2024-12-31", tilDato: "2024-01-01" }],
    });
    expect(resultat.success).toBe(false);
  });

  it("avviser datoer frem i tid i ytelse-rad", () => {
    const iMorgen = new Date();
    iMorgen.setDate(iMorgen.getDate() + 1);
    const dato = iMorgen.toISOString().slice(0, 10);

    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      ytelser: [{ fraDato: dato }],
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar beløp som valgfritt tall", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      ytelser: [{ type: "Dagpenger", beløp: 300000 }],
    });
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.ytelser[0].beløp).toBe(300000);
    }
  });

  it("avviser negativt beløp", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      ytelser: [{ beløp: -100 }],
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar organisasjonsnummer med 9 siffer", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      organisasjonsnummer: "123456789",
    });
    expect(resultat.success).toBe(true);
  });

  it("avviser ugyldig organisasjonsnummer", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      organisasjonsnummer: "1234",
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar skjema uten enhet", () => {
    const resultat = opprettSakSchema.safeParse({
      ...minimaltGyldigSkjema,
      enhet: undefined,
    });
    expect(resultat.success).toBe(true);
  });
});
