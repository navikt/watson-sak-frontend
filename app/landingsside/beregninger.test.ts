import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Avslutningsdatoer } from "~/statistikk/mock-data.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "ks-1",
    personIdent: "12345678901",
    saksbehandlere: {
      eier: null,
      deltMed: [],
      opprettetAv: { navIdent: "Z123456", navn: "Test Saksbehandler" },
    },
    status: "UFORDELT",
    kategori: "UDEFINERT",
    kilde: "INTERN",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [
      {
        id: "ytelse-1",
        type: "Dagpenger",
        periodeFra: "2026-03-18",
        periodeTil: "2026-03-18",
        belop: null,
      },
    ],
    merking: null,
    resultat: null,
    opprettet: "2026-03-18T00:00:00Z",
    oppdatert: null,
    ...overstyringer,
  };
}

describe("beregnDineSakerSiste14Dager", () => {
  test("filtrerer på opprettet og beregner nøkkeltall for siste 14 dager", () => {
    const saker = [
      lagKontrollsak({ id: "1", opprettet: "2026-03-18T00:00:00Z", status: "UTREDES" }),
      lagKontrollsak({ id: "2", opprettet: "2026-03-10T00:00:00Z", status: "UFORDELT" }),
      lagKontrollsak({ id: "3", opprettet: "2026-03-09T00:00:00Z", status: "FORVALTNING" }),
      lagKontrollsak({ id: "4", opprettet: "2026-03-08T00:00:00Z", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "5", opprettet: "2026-03-07T00:00:00Z", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "6", opprettet: "2026-02-20T00:00:00Z", status: "UFORDELT" }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "4": "2026-03-12",
      "5": "2026-03-13",
    };

    const resultat = beregnDineSakerSiste14Dager({
      saker,
      avslutningsdatoer,
      tidligereTipsSakIder: ["4"],
      referansedato: "2026-03-18",
    });

    expect(resultat).toEqual({
      antallSakerJobbetMed: 5,
      antallTipsAvklart: 1,
      antallSendtTilNayNfp: 1,
      snittBehandlingstidPerSak: 5,
      antallHenlagteSaker: 0,
      antallHenlagteTips: 0,
    });
  });

  test("returnerer null for snitt behandlingstid når ingen avsluttede eller henlagte saker finnes", () => {
    const saker = [
      lagKontrollsak({ id: "1", opprettet: "2026-03-18T00:00:00Z", status: "UTREDES" }),
      lagKontrollsak({ id: "2", opprettet: "2026-03-10T00:00:00Z", status: "UFORDELT" }),
    ];

    const resultat = beregnDineSakerSiste14Dager({
      saker,
      avslutningsdatoer: {},
      tidligereTipsSakIder: [],
      referansedato: "2026-03-18",
    });

    expect(resultat.snittBehandlingstidPerSak).toBeNull();
    expect(resultat.antallHenlagteSaker).toBe(0);
    expect(resultat.antallHenlagteTips).toBe(0);
  });

  test("bruker backend opprettet og backend-status for kontrollsaker", () => {
    const saker = [
      lagKontrollsak({ id: "ks-1", opprettet: "2026-03-18T00:00:00Z", status: "UTREDES" }),
      lagKontrollsak({ id: "ks-2", opprettet: "2026-03-10T00:00:00Z", status: "UFORDELT" }),
      lagKontrollsak({ id: "ks-3", opprettet: "2026-03-09T00:00:00Z", status: "FORVALTNING" }),
      lagKontrollsak({ id: "ks-4", opprettet: "2026-03-08T00:00:00Z", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "ks-5", opprettet: "2026-03-07T00:00:00Z", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "ks-6", opprettet: "2026-02-20T00:00:00Z", status: "UFORDELT" }),
    ];

    const avslutningsdatoer: Avslutningsdatoer = {
      "ks-4": "2026-03-12",
      "ks-5": "2026-03-13",
    };

    const resultat = beregnDineSakerSiste14Dager({
      saker,
      avslutningsdatoer,
      tidligereTipsSakIder: ["ks-4"],
      referansedato: "2026-03-18",
    });

    expect(resultat).toEqual({
      antallSakerJobbetMed: 5,
      antallTipsAvklart: 1,
      antallSendtTilNayNfp: 1,
      snittBehandlingstidPerSak: 5,
      antallHenlagteSaker: 0,
      antallHenlagteTips: 0,
    });
  });
});
