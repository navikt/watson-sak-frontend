import { describe, expect, it } from "vitest";
import type { Sak } from "./typer";
import { sorterSakerEtterDato } from "./utils";

const lagSak = (id: string, datoInnmeldt: string): Sak => ({
  id,
  datoInnmeldt,
  kilde: "telefon",
  notat: "",
  fødselsnummer: "12345678901",
  ytelser: [],
  status: "tips mottatt",
  seksjon: "Seksjon A",
});

describe("sorterSakerEtterDato", () => {
  const saker: Sak[] = [
    lagSak("1", "2026-01-15"),
    lagSak("2", "2026-02-01"),
    lagSak("3", "2026-01-20"),
  ];

  it("sorterer nyest først", () => {
    const resultat = sorterSakerEtterDato(saker, "nyest");
    expect(resultat.map((s) => s.id)).toEqual(["2", "3", "1"]);
  });

  it("sorterer eldst først", () => {
    const resultat = sorterSakerEtterDato(saker, "eldst");
    expect(resultat.map((s) => s.id)).toEqual(["1", "3", "2"]);
  });

  it("muterer ikke originallisten", () => {
    const kopi = [...saker];
    sorterSakerEtterDato(saker, "nyest");
    expect(saker).toEqual(kopi);
  });
});
