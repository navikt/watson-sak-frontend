import { describe, expect, it } from "vitest";
import { lagTillatteHandlinger } from "./handlinger/saksflyt/testdata";

function henleggelsesarsakerFor(felt: string, steg: "UTREDNING" | "STRAFFERETTSLIG_VURDERING") {
  return lagTillatteHandlinger({ steg }).feltskjema.find((f) => f.felt === felt)?.verdier;
}

describe("hentMockTillatteHandlinger", () => {
  it("tilbyr AKTIV og VENTER_PA_INFORMASJON ved strafferettslig vurdering", () => {
    expect(lagTillatteHandlinger({ steg: "STRAFFERETTSLIG_VURDERING" }).tillatteStatuser).toEqual([
      "AKTIV",
      "VENTER_PA_INFORMASJON",
      "I_BERO",
    ]);
  });

  it("lar en sak i bero gjenopptas med alle ordinære statuser i steget", () => {
    expect(
      lagTillatteHandlinger({
        steg: "UTREDNING",
        status: "I_BERO",
        statusFørBero: "VENTER_PA_INFORMASJON",
      }).tillatteStatuser,
    ).toEqual(["AKTIV", "VENTER_PA_INFORMASJON"]);
  });

  it("tilbyr nøyaktig de sju henleggelsesårsakene for utredning, i fast rekkefølge", () => {
    expect(henleggelsesarsakerFor("utredning.henleggelsesarsak", "UTREDNING")).toEqual([
      { verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" },
      { verdi: "IKKE_TILSTREKKELIG_BEVISGRUNNLAG", etikett: "Ikke tilstrekkelig dokumentasjon" },
      { verdi: "IKKE_TILSTREKKELIG_SKYLD", etikett: "Ikke tilstrekkelig skyld" },
      { verdi: "FORELDET", etikett: "Foreldet" },
      {
        verdi: "SAK_PABEGYNT_ELLER_OVERTATT_AV_ANDRE",
        etikett: "Sak påbegynt eller overtatt av andre",
      },
      { verdi: "IKKE_PRIORITERT", etikett: "Ikke prioritert" },
      { verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" },
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
