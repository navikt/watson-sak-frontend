import { beforeEach, describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Avslutningsdatoer } from "~/statistikk/mock-data.server";
import { resetDefaultSession } from "~/testing/mock-store/reset.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";

const testRequest = new Request("http://localhost");

beforeEach(() => {
  resetDefaultSession();
});

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: "ks-1",
    personIdent: "12345678901",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "OPPRETTET",
    kategori: "ANNET",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    blokkert: null,
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
      lagKontrollsak({ id: "2", opprettet: "2026-03-10T00:00:00Z", status: "OPPRETTET" }),
      lagKontrollsak({
        id: "3",
        opprettet: "2026-03-09T00:00:00Z",
        status: "UTREDES",
        blokkert: "VENTER_PA_VEDTAK",
      }),
      lagKontrollsak({ id: "4", opprettet: "2026-03-08T00:00:00Z", status: "HENLAGT" }),
      lagKontrollsak({ id: "5", opprettet: "2026-03-07T00:00:00Z", status: "HENLAGT" }),
      lagKontrollsak({
        id: "6",
        opprettet: "2026-02-20T00:00:00Z",
        status: "OPPRETTET",
        saksbehandlere: {
          eier: null,
          deltMed: [],
          opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
        },
      }),
    ];
    const avslutningsdatoer: Avslutningsdatoer = {
      "4": "2026-03-12",
      "5": "2026-03-13",
    };

    const resultat = beregnDineSakerSiste14Dager({
      request: testRequest,
      saker,
      avslutningsdatoer,
      tidligereTipsSakIder: ["4"],
      referansedato: "2026-03-18",
    });

    expect(resultat).toEqual({
      antallSakerJobbetMed: 5,
      antallTipsTilVurdering: 0,
      antallSendtTilNayNfp: 0,
      snittBehandlingstidPerSak: null,
      antallHenlagteSaker: 1,
      antallHenlagteTips: 1,
      antallSakerIBero: 0,
    });
  });

  test("returnerer null for snitt behandlingstid når ingen avsluttede eller henlagte saker finnes", () => {
    const saker = [
      lagKontrollsak({ id: "1", opprettet: "2026-03-18T00:00:00Z", status: "UTREDES" }),
      lagKontrollsak({
        id: "2",
        opprettet: "2026-03-10T00:00:00Z",
        status: "OPPRETTET",
        saksbehandlere: {
          eier: null,
          deltMed: [],
          opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
        },
      }),
    ];

    const resultat = beregnDineSakerSiste14Dager({
      request: testRequest,
      saker,
      avslutningsdatoer: {},
      tidligereTipsSakIder: [],
      referansedato: "2026-03-18",
    });

    expect(resultat.snittBehandlingstidPerSak).toBeNull();
    expect(resultat.antallHenlagteSaker).toBe(0);
    expect(resultat.antallHenlagteTips).toBe(0);
    expect(resultat.antallSakerIBero).toBe(0);
  });

  test("bruker backend opprettet og backend-status for kontrollsaker", () => {
    const saker = [
      lagKontrollsak({ id: "ks-1", opprettet: "2026-03-18T00:00:00Z", status: "UTREDES" }),
      lagKontrollsak({ id: "ks-2", opprettet: "2026-03-10T00:00:00Z", status: "OPPRETTET" }),
      lagKontrollsak({
        id: "ks-3",
        opprettet: "2026-03-09T00:00:00Z",
        status: "UTREDES",
        blokkert: "VENTER_PA_VEDTAK",
      }),
      lagKontrollsak({ id: "ks-4", opprettet: "2026-03-08T00:00:00Z", status: "HENLAGT" }),
      lagKontrollsak({ id: "ks-5", opprettet: "2026-03-07T00:00:00Z", status: "HENLAGT" }),
      lagKontrollsak({
        id: "ks-6",
        opprettet: "2026-02-20T00:00:00Z",
        status: "OPPRETTET",
        saksbehandlere: {
          eier: null,
          deltMed: [],
          opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
        },
      }),
    ];

    const avslutningsdatoer: Avslutningsdatoer = {
      "ks-4": "2026-03-12",
      "ks-5": "2026-03-13",
    };

    const resultat = beregnDineSakerSiste14Dager({
      request: testRequest,
      saker,
      avslutningsdatoer,
      tidligereTipsSakIder: ["ks-4"],
      referansedato: "2026-03-18",
    });

    expect(resultat).toEqual({
      antallSakerJobbetMed: 5,
      antallTipsTilVurdering: 0,
      antallSendtTilNayNfp: 0,
      snittBehandlingstidPerSak: null,
      antallHenlagteSaker: 1,
      antallHenlagteTips: 1,
      antallSakerIBero: 0,
    });
  });

  test("teller ikke eierløse saker som jobbet med de siste 14 dagene", () => {
    const saker = [
      lagKontrollsak({
        id: "1",
        opprettet: "2026-03-18T00:00:00Z",
        status: "OPPRETTET",
        saksbehandlere: {
          eier: null,
          deltMed: [],
          opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
        },
      }),
      lagKontrollsak({ id: "2", opprettet: "2026-03-17T00:00:00Z", status: "UTREDES" }),
    ];

    const resultat = beregnDineSakerSiste14Dager({
      request: testRequest,
      saker,
      avslutningsdatoer: {},
      tidligereTipsSakIder: [],
      referansedato: "2026-03-18",
    });

    expect(resultat.antallSakerJobbetMed).toBe(1);
    expect(resultat.antallTipsTilVurdering).toBe(0);
    expect(resultat.antallSakerIBero).toBe(0);
  });
});
