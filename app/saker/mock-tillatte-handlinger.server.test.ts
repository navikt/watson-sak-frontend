import { describe, expect, it } from "vitest";
import { lagTillatteHandlinger } from "./handlinger/saksflyt/testdata";

function henleggelsesarsakerFor(felt: string, steg: "UTREDNING" | "STRAFFERETTSLIG_VURDERING") {
  return lagTillatteHandlinger({ steg }).feltskjema.find((f) => f.felt === felt)?.verdier;
}

describe("hentMockTillatteHandlinger", () => {
  it("tilbyr nøyaktig de fem henleggelsesårsakene for utredning, i fast rekkefølge", () => {
    expect(henleggelsesarsakerFor("utredning.henleggelsesarsak", "UTREDNING")).toEqual([
      { verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" },
      { verdi: "IKKE_TILSTREKKELIG_BEVISGRUNNLAG", etikett: "Ikke tilstrekkelig bevisgrunnlag" },
      { verdi: "IKKE_TILSTREKKELIG_SKYLD", etikett: "Ikke tilstrekkelig skyld" },
      { verdi: "INGEN_UTREDNING", etikett: "Ingen utredning" },
      { verdi: "FORELDET", etikett: "Foreldet" },
    ]);
  });

  it("beholder henleggelsesårsakene for strafferettslig vurdering", () => {
    expect(
      henleggelsesarsakerFor(
        "strafferettsligVurdering.henleggelsesarsak",
        "STRAFFERETTSLIG_VURDERING",
      ),
    ).toEqual([
      { verdi: "BEVISETS_STILLING", etikett: "Bevisets stilling" },
      { verdi: "INTET_STRAFFBART_FORHOLD", etikett: "Intet straffbart forhold" },
      { verdi: "FORELDET", etikett: "Foreldet" },
      { verdi: "BELOP_UNDER_PATALEGRENSE", etikett: "Beløp under påtalegrense" },
    ]);
  });
});
