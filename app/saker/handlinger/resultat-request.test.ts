import { describe, expect, it } from "vitest";
import type { TillatteHandlingerResponse } from "~/saker/types.backend";
import { byggLagreResultatRequest, resultatFeltErAktivt } from "./resultat-request";

const feltskjema: TillatteHandlingerResponse["feltskjema"] = [
  {
    felt: "utredning.type",
    etikett: "Resultat fra utredningen",
    datatype: "enum",
    paakrevd: true,
    verdier: [
      { verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" },
      { verdi: "HENLAGT", etikett: "Henlagt" },
    ],
  },
  {
    felt: "utredning.henleggelsesarsak",
    etikett: "Årsak til henleggelse",
    datatype: "enum",
    paakrevd: false,
    paakrevdNar: "utredning.type=HENLAGT",
    verdier: [{ verdi: "IKKE_TILSTREKKELIG_SKYLD", etikett: "Ikke tilstrekkelig skyld" }],
  },
];

function skjemaData(verdier: Record<string, string>, ekstra?: Record<string, string>): FormData {
  const data = new FormData();
  data.set("handling", "registrer_resultat");
  for (const [navn, verdi] of Object.entries(verdier)) data.set(`resultat.${navn}`, verdi);
  for (const [navn, verdi] of Object.entries(ekstra ?? {})) data.set(navn, verdi);
  return data;
}

describe("byggLagreResultatRequest", () => {
  it("lager versjonert resultatrequest med feltene fra backend-skjemaet", () => {
    const data = skjemaData({
      "utredning.type": "HENLAGT",
      "utredning.henleggelsesarsak": "IKKE_TILSTREKKELIG_SKYLD",
    });

    expect(byggLagreResultatRequest(data, feltskjema, "UTREDNING")).toEqual({
      versjon: 1,
      steg: "UTREDNING",
      utredning: {
        type: "HENLAGT",
        henleggelsesarsak: "IKKE_TILSTREKKELIG_SKYLD",
      },
    });
  });

  it("krever betinget henleggelsesårsak og avviser valg utenfor feltskjemaet", () => {
    expect(() =>
      byggLagreResultatRequest(
        skjemaData({ "utredning.type": "HENLAGT" }),
        feltskjema,
        "UTREDNING",
      ),
    ).toThrow("Årsak til henleggelse er påkrevd");

    expect(() =>
      byggLagreResultatRequest(
        skjemaData({ "utredning.type": "ANNEN_VERDI" }),
        feltskjema,
        "UTREDNING",
      ),
    ).toThrow("Ugyldig valg for utredning.type");
  });

  it("avviser feltnavn som ikke finnes i både whitelist og backend-skjema", () => {
    expect(() =>
      byggLagreResultatRequest(skjemaData({ "admin.erGodkjent": "true" }), feltskjema, "UTREDNING"),
    ).toThrow("Skjemaet inneholder et ukjent resultatfelt");
  });

  it("bygger beløpspayload med stabil ytelses-ID og godtar nullbeløp", () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const belopsfeltskjema: TillatteHandlingerResponse["feltskjema"] = [
      {
        felt: "ytelser[].belop",
        etikett: "Antatt beløp",
        datatype: "belop",
        paakrevd: false,
        verdier: [],
      },
    ];
    const data = skjemaData({}, { [`ytelse.${id}.belop`]: "0" });
    const ytelser: TillatteHandlingerResponse["tilstand"]["ytelser"] = [
      {
        id,
        type: "DAGPENGER",
        periodeFra: null,
        periodeTil: null,
        belop: null,
        endeligBelop: null,
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        type: "SYKEPENGER",
        periodeFra: null,
        periodeTil: null,
        belop: null,
        endeligBelop: null,
      },
    ];

    expect(
      byggLagreResultatRequest(data, belopsfeltskjema, "UTREDNING", undefined, ytelser, false),
    ).toEqual({
      versjon: 1,
      steg: "UTREDNING",
      ytelser: [{ id, belop: 0 }],
    });

    expect(
      byggLagreResultatRequest(
        skjemaData({}),
        belopsfeltskjema,
        "UTREDNING",
        undefined,
        ytelser,
        false,
      ),
    ).toBeUndefined();
  });

  it("avviser beløp knyttet til en ytelse som ikke finnes i saken", () => {
    const belopsfeltskjema: TillatteHandlingerResponse["feltskjema"] = [
      {
        felt: "ytelser[].belop",
        etikett: "Antatt beløp",
        datatype: "belop",
        paakrevd: false,
        verdier: [],
      },
    ];
    const data = skjemaData(
      {},
      { "ytelse.00000000-0000-4000-8000-000000000002.belop": "1 250,50" },
    );
    const ytelser: TillatteHandlingerResponse["tilstand"]["ytelser"] = [
      {
        id: "00000000-0000-4000-8000-000000000001",
        type: "DAGPENGER",
        periodeFra: null,
        periodeTil: null,
        belop: null,
        endeligBelop: null,
      },
    ];

    expect(() =>
      byggLagreResultatRequest(data, belopsfeltskjema, "UTREDNING", undefined, ytelser, false),
    ).toThrow("Skjemaet inneholder et ukjent ytelsesfelt");
  });
});

describe("resultatFeltErAktivt", () => {
  it("viser betingede felter først når verdien matcher backend-kontrakten", () => {
    const betingetFelt = feltskjema[1];
    expect(betingetFelt).toBeDefined();
    if (!betingetFelt) return;

    expect(resultatFeltErAktivt(betingetFelt, { "utredning.type": "KONTROLLNOTAT" })).toBe(false);
    expect(resultatFeltErAktivt(betingetFelt, { "utredning.type": "HENLAGT" })).toBe(true);
  });
});
