import { describe, expect, test } from "vitest";
import type { Sak } from "~/saker/typer";
import type { Avslutningsdatoer } from "~/statistikk/mock-data.server";
import { beregnDineSakerSiste14Dager } from "./beregninger";

function lagSak(overstyringer: Partial<Sak> = {}): Sak {
  return {
    id: "test-1",
    datoInnmeldt: "2026-03-01",
    kilde: "telefon",
    notat: "Testnotat",
    fødselsnummer: "12345678901",
    ytelser: ["Dagpenger"],
    status: "tips mottatt",
    seksjon: "Seksjon A",
    tags: [],
    ...overstyringer,
  };
}

describe("beregnDineSakerSiste14Dager", () => {
  test("filtrerer på datoInnmeldt og beregner nøkkeltall for siste 14 dager", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", datoInnmeldt: "2026-03-18", status: "under utredning" }),
      lagSak({ id: "2", datoInnmeldt: "2026-03-10", status: "tips avklart" }),
      lagSak({ id: "3", datoInnmeldt: "2026-03-09", status: "videresendt til nay/nfp" }),
      lagSak({ id: "4", datoInnmeldt: "2026-03-08", status: "henlagt" }),
      lagSak({ id: "5", datoInnmeldt: "2026-03-07", status: "avsluttet" }),
      lagSak({ id: "6", datoInnmeldt: "2026-02-20", status: "tips avklart" }),
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
    const saker: Sak[] = [
      lagSak({ id: "1", datoInnmeldt: "2026-03-18", status: "under utredning" }),
      lagSak({ id: "2", datoInnmeldt: "2026-03-10", status: "tips avklart" }),
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
});
