import { describe, expect, it } from "vitest";
import type { KontrollsakSteg, TillatteHandlingerResponse } from "~/saker/types.backend";
import { hentVisbareSteg } from "./tillatte-steg";

const feltskjema: TillatteHandlingerResponse["feltskjema"] = [
  {
    felt: "forvaltning.endeligUtfall.type",
    etikett: "Endelig resultat",
    datatype: "enum",
    paakrevd: false,
    verdier: [
      { verdi: "HENLAGT", etikett: "Henlagt" },
      { verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" },
      { verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" },
    ],
  },
  {
    felt: "forvaltning.endeligUtfall.henleggelsesarsak",
    etikett: "Årsak",
    datatype: "enum",
    paakrevd: false,
    verdier: [{ verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" }],
  },
];

function handlinger(
  steg: KontrollsakSteg,
  resultat: TillatteHandlingerResponse["tilstand"]["resultat"],
  tillatteSteg: KontrollsakSteg[],
): TillatteHandlingerResponse {
  return {
    versjon: 1,
    tilstand: {
      steg,
      status: null,
      statusFørBero: null,
      resultat,
      ytelser: [],
    },
    handlinger: [],
    tillatteSteg,
    tillatteStatuser: [],
    tillatteResultater: [],
    paakrevdeRegistreringer: [],
    paakrevdeRegistreringerPerSteg: {},
    feltskjema,
  };
}

describe("hentVisbareSteg", () => {
  it("viser bare Avsluttet etter henleggelse i Utredning", () => {
    const svar = handlinger(
      "UTREDNING",
      { utredning: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" } },
      ["FORVALTNING", "AVSLUTTET"],
    );
    expect(hentVisbareSteg(svar)).toEqual(["AVSLUTTET"]);
  });

  it("viser bare Avsluttet etter henleggelse i Forvaltning", () => {
    const svar = handlinger(
      "FORVALTNING",
      {
        forvaltning: {
          type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          endeligUtfall: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
        },
      },
      ["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"],
    );
    expect(hentVisbareSteg(svar)).toEqual(["AVSLUTTET"]);
  });

  it("viser bare Avsluttet etter henleggelse i Strafferettslig vurdering", () => {
    const svar = handlinger(
      "STRAFFERETTSLIG_VURDERING",
      {
        strafferettsligVurdering: {
          type: "HENLAGT",
          henleggelsesarsak: "IKKE_TILSTREKKELIG_SKYLD",
        },
      },
      ["POLITI", "AVSLUTTET"],
    );
    expect(hentVisbareSteg(svar)).toEqual(["AVSLUTTET"]);
  });

  it("viser bare Avsluttet etter henleggelse hos Politi", () => {
    const svar = handlinger(
      "POLITI",
      { politi: { type: "HENLAGT", begrunnelse: "Ingen tiltale" } },
      ["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"],
    );
    expect(hentVisbareSteg(svar)).toEqual(["AVSLUTTET"]);
  });

  it("bruker resultatet fra gjeldende steg, ikke et tidligere henlagt resultat", () => {
    const svar = handlinger(
      "FORVALTNING",
      {
        utredning: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
        forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
      },
      ["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"],
    );
    expect(hentVisbareSteg(svar)).toEqual(["STRAFFERETTSLIG_VURDERING"]);
  });
});
