import { describe, expect, it } from "vitest";
import type { KontrollsakSteg, TillatteHandlingerResponse } from "~/saker/types.backend";
import { harLagretResultatForOvergang, hentVisbareSteg } from "./tillatte-steg";

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
  it("viser kandidatoverganger selv om gjeldende steg mangler resultat", () => {
    const svar = handlinger(
      "UTREDNING",
      { forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" } },
      [],
    );
    svar.muligeNesteSteg = ["FORVALTNING", "AVSLUTTET"];
    expect(hentVisbareSteg(svar)).toEqual(["FORVALTNING", "AVSLUTTET"]);
    expect(harLagretResultatForOvergang(svar, "FORVALTNING")).toBe(false);
  });

  it("krever komplettering av delvis lagret forvaltnings- og politiresultat", () => {
    const forvaltning = handlinger(
      "FORVALTNING",
      { forvaltning: { type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE" } },
      [],
    );
    forvaltning.muligeNesteSteg = ["AVSLUTTET"];
    expect(hentVisbareSteg(forvaltning)).toEqual(["AVSLUTTET"]);
    expect(harLagretResultatForOvergang(forvaltning, "AVSLUTTET")).toBe(false);

    const politi = handlinger("POLITI", { politi: { type: "DOMFELLELSE" } }, []);
    politi.muligeNesteSteg = ["AVSLUTTET"];
    expect(harLagretResultatForOvergang(politi, "AVSLUTTET")).toBe(false);
    politi.tilstand.resultat = {
      politi: {
        type: "DOMFELLELSE",
        domstype: "Fengsel",
        varighet: "To måneder",
        redusertForEmkArtikkel6: false,
        redusertForLangSaksbehandling: false,
      },
    };
    expect(harLagretResultatForOvergang(politi, "AVSLUTTET")).toBe(true);
  });

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

  it("viser Avsluttet etter henlagt Forvaltning uten endelig beløp", () => {
    const svar = handlinger(
      "FORVALTNING",
      {
        forvaltning: {
          type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          endeligUtfall: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
        },
      },
      ["AVSLUTTET"],
    );
    svar.tilstand.ytelser = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        type: "SYKEPENGER",
        periodeFra: null,
        periodeTil: null,
        belop: 100,
        endeligBelop: null,
      },
    ];
    expect(hentVisbareSteg(svar)).toEqual(["AVSLUTTET"]);

    svar.tilstand.resultat = {
      forvaltning: {
        type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
        endeligUtfall: { type: "HENLAGT" },
      },
    };
    expect(hentVisbareSteg(svar)).toEqual([]);

    svar.tilstand.resultat = {
      forvaltning: {
        type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
        endeligUtfall: { type: "KONTROLLNOTAT" },
      },
    };
    expect(hentVisbareSteg(svar)).toEqual([]);
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
