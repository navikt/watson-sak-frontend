import { beforeEach, describe, expect, it } from "vitest";
import {
  hentHenleggelsesnotaterForSak,
  registrerHenleggelsesnotater,
} from "./henleggelsesnotater.server";
import { hentMockState, resetDefaultSession } from "./session.server";

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

describe("mock-store for henleggelsesnotater", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("journalfører notat med tekst og registrerer notat uten tekst", () => {
    const resultat = registrerHenleggelsesnotater(state(), "7", [
      { notattype: "HENLEGGELSESNOTAT", tekst: "Henlegges" },
      { notattype: "ORIENTERINGSNOTAT", tekst: null },
    ]);

    expect(resultat).toEqual([
      {
        notattype: "HENLEGGELSESNOTAT",
        utfall: "JOURNALFORT",
        journalpostId: "mock-jp-7-HENLEGGELSESNOTAT",
      },
      { notattype: "ORIENTERINGSNOTAT", utfall: "REGISTRERT_UTEN_TEKST", journalpostId: null },
    ]);
    expect(hentHenleggelsesnotaterForSak(state(), "7")).toEqual([
      expect.objectContaining({
        notattype: "HENLEGGELSESNOTAT",
        journalpostId: "mock-jp-7-HENLEGGELSESNOTAT",
      }),
      expect.objectContaining({ notattype: "ORIENTERINGSNOTAT", journalpostId: null }),
    ]);
  });

  it("gir ALLEREDE_JOURNALFORT ved ny registrering av journalført notat", () => {
    registrerHenleggelsesnotater(state(), "7", [{ notattype: "HENLEGGELSESNOTAT", tekst: "a" }]);
    const resultat = registrerHenleggelsesnotater(state(), "7", [
      { notattype: "HENLEGGELSESNOTAT", tekst: "b" },
    ]);
    expect(resultat).toEqual([
      {
        notattype: "HENLEGGELSESNOTAT",
        utfall: "ALLEREDE_JOURNALFORT",
        journalpostId: "mock-jp-7-HENLEGGELSESNOTAT",
      },
    ]);
    expect(hentHenleggelsesnotaterForSak(state(), "7")).toHaveLength(1);
  });

  it("journalfører notat som tidligere ble registrert uten tekst", () => {
    registrerHenleggelsesnotater(state(), "7", [{ notattype: "ORIENTERINGSNOTAT", tekst: null }]);
    const resultat = registrerHenleggelsesnotater(state(), "7", [
      { notattype: "ORIENTERINGSNOTAT", tekst: "nå med tekst" },
    ]);
    expect(resultat[0]?.utfall).toBe("JOURNALFORT");
    expect(hentHenleggelsesnotaterForSak(state(), "7")).toHaveLength(1);
  });

  it("gir FEILET for typer som simuleres som feilet, uten å lagre dem", () => {
    const resultat = registrerHenleggelsesnotater(
      state(),
      "7",
      [{ notattype: "HENLEGGELSESNOTAT", tekst: "a" }],
      ["HENLEGGELSESNOTAT"],
    );
    expect(resultat[0]).toEqual({
      notattype: "HENLEGGELSESNOTAT",
      utfall: "FEILET",
      journalpostId: null,
    });
    expect(hentHenleggelsesnotaterForSak(state(), "7")).toEqual([]);
  });

  it("tømmes ved reset", () => {
    registrerHenleggelsesnotater(state(), "7", [{ notattype: "HENLEGGELSESNOTAT", tekst: "a" }]);
    resetDefaultSession();
    expect(hentHenleggelsesnotaterForSak(state(), "7")).toEqual([]);
  });
});
