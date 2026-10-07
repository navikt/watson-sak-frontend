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

  it("har egne NAY- og NFP-årsaker for strafferettslig vurdering", () => {
    const årsaker = henleggelsesarsakerFor(
      "strafferettsligVurdering.henleggelsesarsak",
      "STRAFFERETTSLIG_VURDERING",
    );
    expect(årsaker).toHaveLength(18);
    expect(årsaker?.slice(0, 2)).toEqual([
      { verdi: "NAY_MANGLER_I_SAKSBEHANDLINGEN", etikett: "NAY: Mangler i saksbehandlingen" },
      { verdi: "NFP_MANGLER_I_SAKSBEHANDLINGEN", etikett: "NFP: Mangler i saksbehandlingen" },
    ]);
    expect(årsaker?.at(-1)).toEqual({
      verdi: "MANGLER_SUBJEKTIV_SKYLD",
      etikett: "Mangler subjektiv skyld",
    });
  });
});
