import { describe, expect, it } from "vitest";
import {
  byggInnsending,
  endreStatus,
  hentHandlinger,
  hentStartverdier,
  INGEN_STATUS,
  type Sakshandling,
} from "./saksflyt";
import { aapId, dagpengerId, lagTillatteHandlinger, lagYtelse } from "./testdata";

function ider(handlinger: Sakshandling[]) {
  return handlinger.map((handling) => handling.id);
}

function finn(handlinger: Sakshandling[], id: string): Sakshandling {
  const handling = handlinger.find((kandidat) => kandidat.id === id);
  if (!handling) throw new Error(`Fant ikke handlingen ${id}`);
  return handling;
}

describe("hentHandlinger", () => {
  it.each([
    ["OPPRETTET", null, ["til-utredning", "til-strafferettslig-vurdering"]],
    ["UTREDNING", "AKTIV", ["til-forvaltning", "informasjonssak", "henlegg"]],
    [
      "FORVALTNING",
      "VENTER_PA_VEDTAK",
      ["til-strafferettslig-vurdering", "registrer-feilutbetaling", "henlegg"],
    ],
    ["STRAFFERETTSLIG_VURDERING", "AKTIV", ["til-politiet", "feilutbetalingssak", "henlegg"]],
    ["POLITI", "VENTER_PA_RESULTAT", ["registrer-avgjorelse"]],
  ] as const)("viser handlingene for %s i fast rekkefølge", (steg, status, forventet) => {
    expect(ider(hentHandlinger(lagTillatteHandlinger({ steg, status })))).toEqual(forventet);
  });

  it("deler handlingene i steg og resultat", () => {
    const handlinger = hentHandlinger(lagTillatteHandlinger({ steg: "UTREDNING" }));
    expect(handlinger.map((handling) => [handling.id, handling.seksjon])).toEqual([
      ["til-forvaltning", "steg"],
      ["informasjonssak", "resultat"],
      ["henlegg", "resultat"],
    ]);
  });

  it("viser ingen handlinger når saken er i bero", () => {
    expect(hentHandlinger(lagTillatteHandlinger({ status: "I_BERO" }))).toEqual([]);
  });

  it("viser bare Avslutt sak når saken er henlagt i gjeldende steg", () => {
    const tillatte = lagTillatteHandlinger({
      resultat: { utredning: { type: "HENLAGT", henleggelsesarsak: "BEVISETS_STILLING" } },
    });
    expect(ider(hentHandlinger(tillatte))).toEqual(["avslutt"]);
  });

  it("tilbyr Avslutt sak når lagret resultat allerede gir avslutning", () => {
    const tillatte = lagTillatteHandlinger({
      steg: "POLITI",
      status: "VENTER_PA_RESULTAT",
      resultat: { politi: { type: "BOT" } },
    });
    expect(ider(hentHandlinger(tillatte)).at(-1)).toBe("avslutt");
    expect(finn(hentHandlinger(tillatte), "avslutt").trinn.map((trinn) => trinn.type)).toEqual([
      "bekreftAvslutning",
    ]);
  });

  it("skjuler handlinger med resultat som backend ikke tillater", () => {
    const tillatte = lagTillatteHandlinger({ steg: "STRAFFERETTSLIG_VURDERING" });
    tillatte.tillatteResultater = ["ANMELDT", "HENLAGT"];
    expect(ider(hentHandlinger(tillatte))).toEqual(["til-politiet", "henlegg"]);
  });

  it("skjuler stegbytte som ikke er blant mulige neste steg", () => {
    const tillatte = lagTillatteHandlinger({ steg: "OPPRETTET", status: null });
    tillatte.muligeNesteSteg = ["UTREDNING"];
    expect(ider(hentHandlinger(tillatte))).toEqual(["til-utredning"]);
  });

  it("skjuler alt når backend ikke tillater å flytte saken", () => {
    const tillatte = lagTillatteHandlinger();
    tillatte.handlinger = tillatte.handlinger.filter(
      (handling) => handling.type !== "FLYTT_TIL_NESTE_STEG",
    );
    expect(hentHandlinger(tillatte)).toEqual([]);
  });

  it("skjuler henleggelse når feltet for årsak mangler i feltskjemaet", () => {
    const tillatte = lagTillatteHandlinger({ steg: "STRAFFERETTSLIG_VURDERING" });
    tillatte.feltskjema = tillatte.feltskjema.filter(
      (felt) => felt.felt !== "strafferettsligVurdering.henleggelsesarsak",
    );
    expect(ider(hentHandlinger(tillatte))).toEqual(["til-politiet", "feilutbetalingssak"]);
  });

  it("tilbyr bare avslutning når politiet har henlagt saken uten påklaging", () => {
    const tillatte = lagTillatteHandlinger({
      steg: "POLITI",
      status: "VENTER_PA_RESULTAT",
      resultat: { politi: { type: "HENLAGT", henleggelsesarsak: "FORELDET" } },
    });
    expect(ider(hentHandlinger(tillatte))).toEqual(["avslutt"]);
  });

  it("tilbyr ny avgjørelse når henleggelsen er påklaget", () => {
    const tillatte = lagTillatteHandlinger({
      steg: "POLITI",
      status: "PAAKLAGET",
      resultat: { politi: { type: "HENLAGT", henleggelsesarsak: "FORELDET" } },
    });
    expect(ider(hentHandlinger(tillatte))).toEqual(["registrer-avgjorelse", "avslutt"]);
  });
});

describe("registrer avgjørelse fra politiet", () => {
  const tillatte = lagTillatteHandlinger({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
  const handling = finn(hentHandlinger(tillatte), "registrer-avgjorelse");
  const skjema = handling.trinn.find((trinn) => trinn.type === "skjema");
  if (skjema?.type !== "skjema") throw new Error("Mangler skjematrinn");
  const primær = (verdier: Record<string, string>) =>
    typeof skjema.primær === "function" ? skjema.primær(verdier) : skjema.primær;

  it("lagrer påklaget henleggelse uten å avslutte saken", () => {
    const verdier = { "politi.type": "HENLAGT", paaklaget: "true" };
    expect(primær(verdier)).toBe("Registrer påklaget henleggelse");
    expect(skjema.lagreUtenAvslutning?.(verdier)).toBe(true);
    expect(skjema.kanLagreUtenAvslutning?.(verdier)).toBe(false);
  });

  it("henlegger og avslutter når henleggelsen ikke påklages", () => {
    const verdier = { "politi.type": "HENLAGT", paaklaget: "false" };
    expect(primær(verdier)).toBe("Henlegg og avslutt sak");
    expect(skjema.lagreUtenAvslutning?.(verdier)).toBe(false);
    expect(skjema.kanLagreUtenAvslutning?.(verdier)).toBe(false);
  });

  it("avslutter eller lagrer andre utfall", () => {
    const verdier = { "politi.type": "BOT", paaklaget: "true" };
    expect(primær(verdier)).toBe("Registrer resultat og avslutt saken");
    expect(skjema.lagreUtenAvslutning?.(verdier)).toBe(false);
    expect(skjema.kanLagreUtenAvslutning?.(verdier)).toBe(true);
  });
});

describe("hentStartverdier", () => {
  it("fyller inn lagrede beløp for feltene handlingen bruker", () => {
    const tillatte = lagTillatteHandlinger({
      steg: "FORVALTNING",
      ytelser: [
        lagYtelse({ belop: 1000, endeligBelop: 1250.5 }),
        lagYtelse({ id: aapId, type: "AAP", endeligBelop: null }),
      ],
    });
    const handling = finn(hentHandlinger(tillatte), "til-strafferettslig-vurdering");
    expect(hentStartverdier(handling, tillatte)).toEqual({
      [`ytelse.${dagpengerId}.endeligBelop`]: "1250,5",
    });
  });

  it("velger statusen saken hadde før bero", () => {
    const tillatte = lagTillatteHandlinger({
      status: "I_BERO",
      statusFørBero: "VENTER_PA_INFORMASJON",
    });
    expect(hentStartverdier(endreStatus, tillatte)).toEqual({ status: "VENTER_PA_INFORMASJON" });
  });

  it("bruker egen verdi for Aktiv når saken ikke har status", () => {
    const tillatte = lagTillatteHandlinger({ steg: "OPPRETTET", status: null });
    expect(hentStartverdier(endreStatus, tillatte)).toEqual({ status: INGEN_STATUS });
  });
});

describe("byggInnsending", () => {
  it("sender faste resultatverdier sammen med valgt årsak", () => {
    const tillatte = lagTillatteHandlinger();
    const henlegg = finn(hentHandlinger(tillatte), "henlegg");
    const formData = byggInnsending(
      henlegg,
      { "utredning.henleggelsesarsak": "BEVISETS_STILLING" },
      tillatte,
    );
    expect(Object.fromEntries(formData)).toEqual({
      handling: "endre_steg_dialog",
      versjon: "1",
      steg: "AVSLUTTET",
      registrerResultat: "true",
      "resultat.utredning.type": "HENLAGT",
      "resultat.utredning.henleggelsesarsak": "BEVISETS_STILLING",
    });
  });

  it("sender stegbytte uten resultat når handlingen ikke har felt", () => {
    const tillatte = lagTillatteHandlinger({ steg: "OPPRETTET", status: null });
    const formData = byggInnsending(finn(hentHandlinger(tillatte), "til-utredning"), {}, tillatte);
    expect(Object.fromEntries(formData)).toEqual({
      handling: "endre_steg_dialog",
      versjon: "1",
      steg: "UTREDNING",
      registrerResultat: "false",
    });
  });

  it("sender beløp per ytelse og hopper over sjekklisten", () => {
    const tillatte = lagTillatteHandlinger();
    const formData = byggInnsending(
      finn(hentHandlinger(tillatte), "til-forvaltning"),
      {
        "utredning.type": "FEILUTBETALINGSSAK_ORDINAER",
        [`ytelse.${dagpengerId}.belop`]: "12 000",
        "sjekkliste.0": "true",
      },
      tillatte,
    );
    expect(Object.fromEntries(formData)).toMatchObject({
      steg: "FORVALTNING",
      "resultat.utredning.type": "FEILUTBETALINGSSAK_ORDINAER",
      [`ytelse.${dagpengerId}.belop`]: "12 000",
    });
    expect(formData.has("sjekkliste.0")).toBe(false);
  });

  it("dropper felt som ikke lenger er aktive etter at utfallet er endret", () => {
    const tillatte = lagTillatteHandlinger({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    const formData = byggInnsending(
      finn(hentHandlinger(tillatte), "registrer-avgjorelse"),
      {
        "politi.type": "BOT",
        "politi.strafferabatt": "true",
        "politi.strafferabattProsent": "20",
        "politi.detaljer": "30 dagsbøter",
      },
      tillatte,
    );
    expect(Object.fromEntries(formData)).toMatchObject({
      "resultat.politi.type": "BOT",
      "resultat.politi.detaljer": "30 dagsbøter",
    });
    expect(formData.has("resultat.politi.strafferabatt")).toBe(false);
    expect(formData.has("resultat.politi.strafferabattProsent")).toBe(false);
  });

  it("lagrer politiresultat uten stegbytte", () => {
    const tillatte = lagTillatteHandlinger({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    const formData = byggInnsending(
      finn(hentHandlinger(tillatte), "registrer-avgjorelse"),
      { "politi.type": "FORELEGG" },
      tillatte,
      { handling: "lagre_resultat" },
    );
    expect(Object.fromEntries(formData)).toEqual({
      handling: "lagre_resultat",
      versjon: "1",
      "resultat.politi.type": "FORELEGG",
    });
  });

  it("sender påklaging sammen med politiets henleggelse", () => {
    const tillatte = lagTillatteHandlinger({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    const formData = byggInnsending(
      finn(hentHandlinger(tillatte), "registrer-avgjorelse"),
      {
        "politi.type": "HENLAGT",
        "politi.henleggelsesarsak": "FORELDET",
        paaklaget: "true",
      },
      tillatte,
      { handling: "lagre_resultat" },
    );
    expect(Object.fromEntries(formData)).toEqual({
      handling: "lagre_resultat",
      versjon: "1",
      "resultat.politi.type": "HENLAGT",
      "resultat.politi.henleggelsesarsak": "FORELDET",
      "resultat.paaklaget": "true",
    });
  });

  it("dropper påklaging når utfallet ikke er henleggelse", () => {
    const tillatte = lagTillatteHandlinger({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    const formData = byggInnsending(
      finn(hentHandlinger(tillatte), "registrer-avgjorelse"),
      { "politi.type": "BOT", paaklaget: "true" },
      tillatte,
    );
    expect(formData.has("resultat.paaklaget")).toBe(false);
  });

  it("sender valgt status", () => {
    const tillatte = lagTillatteHandlinger();
    const formData = byggInnsending(endreStatus, { status: "I_BERO" }, tillatte);
    expect(Object.fromEntries(formData)).toEqual({
      handling: "endre_status",
      versjon: "1",
      status: "I_BERO",
    });
  });
});
