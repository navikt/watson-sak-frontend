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

  it("legger journalført notat i arkivlageret, uten tekst og uten duplikat ved nytt forsøk", async () => {
    const { hentMockArkivJournalposter } = await import("~/saker/arkiv/mock-data.server");
    const notater = [{ notattype: "ORIENTERINGSNOTAT" as const, tekst: "Hemmelig tekst" }];

    registrerHenleggelsesnotater(state(), "7", notater);
    const andre = registrerHenleggelsesnotater(state(), "7", notater);

    expect(andre[0].utfall).toBe("ALLEREDE_JOURNALFORT");
    const treff = hentMockArkivJournalposter(state(), "7").filter(
      (jp) => jp.journalpostId === "mock-jp-7-ORIENTERINGSNOTAT",
    );
    expect(treff).toHaveLength(1);
    expect(treff[0]).toMatchObject({
      tittel: "Orienteringsnotat",
      tema: "KTR",
      journalposttype: "N",
    });
    expect(treff[0].datoOpprettet.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
    expect(JSON.stringify(treff[0])).not.toContain("Hemmelig tekst");
  });

  it("legger ikke notat uten tekst i arkivlageret", async () => {
    const { hentMockArkivJournalposter } = await import("~/saker/arkiv/mock-data.server");
    registrerHenleggelsesnotater(state(), "8", [{ notattype: "HENLEGGELSESNOTAT", tekst: null }]);
    expect(
      hentMockArkivJournalposter(state(), "8").some((jp) => jp.tittel === "Henleggelsesnotat"),
    ).toBe(false);
  });
});
