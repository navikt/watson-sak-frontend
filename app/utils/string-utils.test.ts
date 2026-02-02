import { describe, expect, it } from "vitest";
import {
  camelCaseTilNorsk,
  formaterFødselsnummer,
  snakeCaseTilSetning,
  storFørsteBokstav,
  storFørsteBokstavPerOrd,
} from "./string-utils";

describe("storFørsteBokstav", () => {
  it("gjør første bokstav stor og resten små", () => {
    expect(storFørsteBokstav("hallo")).toBe("Hallo");
    expect(storFørsteBokstav("HALLO")).toBe("Hallo");
    expect(storFørsteBokstav("hALLO")).toBe("Hallo");
  });

  it("håndterer ett tegn", () => {
    expect(storFørsteBokstav("a")).toBe("A");
    expect(storFørsteBokstav("A")).toBe("A");
  });

  it("håndterer norske tegn", () => {
    expect(storFørsteBokstav("ærlig")).toBe("Ærlig");
    expect(storFørsteBokstav("ØYSTEIN")).toBe("Øystein");
    expect(storFørsteBokstav("åse")).toBe("Åse");
  });

  it("returnerer tom streng for null og undefined", () => {
    expect(storFørsteBokstav(null)).toBe("");
    expect(storFørsteBokstav(undefined)).toBe("");
  });

  it("returnerer tom streng for tom streng", () => {
    expect(storFørsteBokstav("")).toBe("");
  });
});

describe("storFørsteBokstavPerOrd", () => {
  it("gjør første bokstav stor i hvert ord", () => {
    expect(storFørsteBokstavPerOrd("hei på deg")).toBe("Hei På Deg");
    expect(storFørsteBokstavPerOrd("OLA NORDMANN")).toBe("Ola Nordmann");
  });

  it("håndterer ett ord", () => {
    expect(storFørsteBokstavPerOrd("oslo")).toBe("Oslo");
  });

  it("håndterer norske tegn", () => {
    expect(storFørsteBokstavPerOrd("ØST NORD")).toBe("Øst Nord");
    expect(storFørsteBokstavPerOrd("ålesund kommune")).toBe("Ålesund Kommune");
  });

  it("ignorerer bindestrek som standard", () => {
    expect(storFørsteBokstavPerOrd("anne-marie")).toBe("Anne-marie");
    expect(storFørsteBokstavPerOrd("STOR-ELVDAL")).toBe("Stor-elvdal");
  });

  it("behandler bindestrek som orddelimeter når inkluderBindestrek er true", () => {
    expect(storFørsteBokstavPerOrd("anne-marie", true)).toBe("Anne-Marie");
    expect(storFørsteBokstavPerOrd("STOR-ELVDAL", true)).toBe("Stor-Elvdal");
    expect(storFørsteBokstavPerOrd("ole-johan hansen", true)).toBe(
      "Ole-Johan Hansen",
    );
  });

  it("returnerer tom streng for null og undefined", () => {
    expect(storFørsteBokstavPerOrd(null)).toBe("");
    expect(storFørsteBokstavPerOrd(undefined)).toBe("");
  });

  it("returnerer tom streng for tom streng", () => {
    expect(storFørsteBokstavPerOrd("")).toBe("");
  });
});

describe("camelCaseTilNorsk", () => {
  it("konverterer camelCase til norsk setning", () => {
    expect(camelCaseTilNorsk("detteErEnTest")).toBe("Dette er en test");
    expect(camelCaseTilNorsk("minVariabel")).toBe("Min variabel");
  });

  it("håndterer norske tegn i camelCase", () => {
    expect(camelCaseTilNorsk("heiPåDeg")).toBe("Hei på deg");
    expect(camelCaseTilNorsk("gåTilVenstre")).toBe("Gå til venstre");
    expect(camelCaseTilNorsk("søkEtterØl")).toBe("Søk etter øl");
  });

  it("håndterer enkeltord", () => {
    expect(camelCaseTilNorsk("hallo")).toBe("Hallo");
  });

  it("erstatter ae, oe og aa med æ, ø og å", () => {
    expect(camelCaseTilNorsk("vaerSaaGod")).toBe("Vær så god");
    expect(camelCaseTilNorsk("hoereDette")).toBe("Høre dette");
    expect(camelCaseTilNorsk("gaaAvsted")).toBe("Gå avsted");
  });

  it("returnerer tom streng for null", () => {
    expect(camelCaseTilNorsk(null)).toBe("");
  });
});

describe("snakeCaseTilSetning", () => {
  it("konverterer snake_case til setning", () => {
    expect(snakeCaseTilSetning("hei_pa_deg")).toBe("Hei pa deg");
    expect(snakeCaseTilSetning("DETTE_ER_EN_TEST")).toBe("Dette er en test");
  });

  it("håndterer enkeltord", () => {
    expect(snakeCaseTilSetning("hallo")).toBe("Hallo");
  });

  it("håndterer ord med bare understrek på slutten", () => {
    expect(snakeCaseTilSetning("test_")).toBe("Test");
  });

  it("returnerer tom streng for null", () => {
    expect(snakeCaseTilSetning(null)).toBe("");
  });

  it("returnerer tom streng for tom streng", () => {
    expect(snakeCaseTilSetning("")).toBe("");
  });
});

describe("formaterFødselsnummer", () => {
  it("formaterer 11-sifret fødselsnummer med mellomrom", () => {
    expect(formaterFødselsnummer("12345678901")).toBe("123456 78901");
    expect(formaterFødselsnummer("01010112345")).toBe("010101 12345");
  });

  it("returnerer uendret verdi for ugyldig lengde", () => {
    expect(formaterFødselsnummer("1234567890")).toBe("1234567890");
    expect(formaterFødselsnummer("123456789012")).toBe("123456789012");
    expect(formaterFødselsnummer("12345")).toBe("12345");
  });

  it("returnerer tom streng for null", () => {
    expect(formaterFødselsnummer(null)).toBe("");
  });

  it("returnerer tom streng for tom streng", () => {
    expect(formaterFødselsnummer("")).toBe("");
  });
});
