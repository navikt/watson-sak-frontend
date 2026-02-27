import { describe, expect, it } from "vitest";
import { registrerSakSchema } from "./validering";

const gyldigSkjema = {
  fødselsnummer: "12345678901",
  ytelser: ["Dagpenger"],
  avdeling: "Kontroll Øst",
  kategori: "Feilutbetaling",
  tags: ["dagpenger"],
  kilde: "telefon" as const,
  beskrivelse: "En beskrivelse av saken",
};

describe("registrerSakSchema", () => {
  it("godtar gyldig skjemadata", () => {
    const resultat = registrerSakSchema.safeParse(gyldigSkjema);
    expect(resultat.success).toBe(true);
  });

  it("krever fødselsnummer med 11 siffer", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fødselsnummer: "123",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.flatten().fieldErrors.fødselsnummer).toBeDefined();
    }
  });

  it("avviser tomt fødselsnummer", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fødselsnummer: "",
    });
    expect(resultat.success).toBe(false);
  });

  it("avviser fødselsnummer med bokstaver", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fødselsnummer: "1234567890a",
    });
    expect(resultat.success).toBe(false);
  });

  it("krever minst én ytelse", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      ytelser: [],
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(resultat.error.flatten().fieldErrors.ytelser).toBeDefined();
    }
  });

  it("krever avdeling", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      avdeling: "",
    });
    expect(resultat.success).toBe(false);
  });

  it("krever kategori", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      kategori: "",
    });
    expect(resultat.success).toBe(false);
  });

  it("krever gyldig kilde", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      kilde: "ugyldig",
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar alle gyldige kilder inkludert nye", () => {
    for (const kilde of [
      "telefon",
      "epost",
      "brev",
      "registersamkjøring",
      "saksbehandler",
      "publikum",
      "politiet",
      "nay",
      "annet",
    ]) {
      const resultat = registrerSakSchema.safeParse({
        ...gyldigSkjema,
        kilde,
      });
      expect(resultat.success).toBe(true);
    }
  });

  it("krever beskrivelse", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      beskrivelse: "",
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar valgfrie datoer", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: "2026-01-01",
      tilDato: "2026-12-31",
    });
    expect(resultat.success).toBe(true);
  });

  it("avviser ugyldige datoer", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      fraDato: "ikke-en-dato",
    });
    expect(resultat.success).toBe(false);
  });

  it("godtar tom e-post", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      kontaktEpost: "",
    });
    expect(resultat.success).toBe(true);
  });

  it("avviser ugyldig e-post", () => {
    const resultat = registrerSakSchema.safeParse({
      ...gyldigSkjema,
      kontaktEpost: "ikke-epost",
    });
    expect(resultat.success).toBe(false);
  });

  it("setter anonymt til false som default", () => {
    const resultat = registrerSakSchema.safeParse(gyldigSkjema);
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.anonymt).toBe(false);
    }
  });

  it("setter tags til tom liste som default", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tags: _tags, ...utenTags } = gyldigSkjema;
    const resultat = registrerSakSchema.safeParse(utenTags);
    expect(resultat.success).toBe(true);
    if (resultat.success) {
      expect(resultat.data.tags).toEqual([]);
    }
  });
});
