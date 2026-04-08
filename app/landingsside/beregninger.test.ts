import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Avslutningsdatoer } from "~/statistikk/mock-data.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "ks-1",
    personIdent: "12345678901",
    saksbehandler: "Z123456",
    status: "OPPRETTET",
    kategori: "ANNET",
    prioritet: "NORMAL",
    mottakEnhet: "4812",
    mottakSaksbehandler: "Z654321",
    ytelser: [
      {
        id: "ytelse-1",
        type: "Dagpenger",
        periodeFra: "2026-03-18",
        periodeTil: "2026-03-18",
      },
    ],
    bakgrunn: null,
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
      lagKontrollsak({ id: "2", opprettet: "2026-03-10T00:00:00Z", status: "AVKLART" }),
      lagKontrollsak({ id: "3", opprettet: "2026-03-09T00:00:00Z", status: "TIL_FORVALTNING" }),
      lagKontrollsak({ id: "4", opprettet: "2026-03-08T00:00:00Z", status: "HENLAGT" }),
      lagKontrollsak({ id: "5", opprettet: "2026-03-07T00:00:00Z", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "6", opprettet: "2026-02-20T00:00:00Z", status: "AVKLART" }),
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
      antallHenlagteSaker: 1,
      antallHenlagteTips: 1,
    });
  });

  test("returnerer null for snitt behandlingstid når ingen avsluttede eller henlagte saker finnes", () => {
    const saker = [
      lagKontrollsak({ id: "1", opprettet: "2026-03-18T00:00:00Z", status: "UTREDES" }),
      lagKontrollsak({ id: "2", opprettet: "2026-03-10T00:00:00Z", status: "AVKLART" }),
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
      lagKontrollsak({ id: "ks-2", opprettet: "2026-03-10T00:00:00Z", status: "AVKLART" }),
      lagKontrollsak({ id: "ks-3", opprettet: "2026-03-09T00:00:00Z", status: "TIL_FORVALTNING" }),
      lagKontrollsak({ id: "ks-4", opprettet: "2026-03-08T00:00:00Z", status: "HENLAGT" }),
      lagKontrollsak({ id: "ks-5", opprettet: "2026-03-07T00:00:00Z", status: "AVSLUTTET" }),
      lagKontrollsak({ id: "ks-6", opprettet: "2026-02-20T00:00:00Z", status: "AVKLART" }),
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
      antallHenlagteSaker: 1,
      antallHenlagteTips: 1,
    });
  });
});
