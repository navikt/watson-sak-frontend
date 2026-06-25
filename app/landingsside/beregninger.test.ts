import { describe, expect, test } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Avslutningsdatoer } from "~/statistikk/mock-data.server";
import { beregnNokkeltall } from "./beregninger";

function lagKontrollsak(overstyringer: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 2,
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
    henleggelsesarsak: null,
    ytelser: [
      {
        type: "DAGPENGER",
        periodeFra: "2026-03-18",
        periodeTil: "2026-03-18",
        belop: null,
        endeligBelop: null,
      },
    ],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-03-18T00:00:00Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    ...overstyringer,
  };
}

describe("beregnNokkeltall", () => {
  test("teller pågående saker (ekskluderer henlagte og avsluttede)", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "OPPRETTET" }),
      lagKontrollsak({ id: 2, status: "UTREDES" }),
      lagKontrollsak({ id: 3, status: "HENLAGT" }),
      lagKontrollsak({ id: 4, status: "AVSLUTTET" }),
      lagKontrollsak({ id: 5, status: "STRAFFERETTSLIG_VURDERING" }),
    ];

    const resultat = beregnNokkeltall(saker, {});

    expect(resultat.pagaendeSaker).toBe(3);
  });

  test("teller saker på vent (blokkert er satt)", () => {
    const saker = [
      lagKontrollsak({ id: 1, blokkert: "I_BERO" }),
      lagKontrollsak({ id: 2, blokkert: "VENTER_PA_VEDTAK" }),
      lagKontrollsak({ id: 3, blokkert: null }),
    ];

    const resultat = beregnNokkeltall(saker, {});

    expect(resultat.paVent).toBe(2);
  });

  test("beregner prosent utredet innen 12 og 15 uker", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "AVSLUTTET", opprettet: "2026-01-01T00:00:00Z" }),
      lagKontrollsak({ id: 2, status: "AVSLUTTET", opprettet: "2026-01-01T00:00:00Z" }),
      lagKontrollsak({ id: 3, status: "HENLAGT", opprettet: "2026-01-01T00:00:00Z" }),
    ];

    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2026-02-01", // 31 dager – innen 12 uker
      "2": "2026-04-15", // 104 dager – innen 15 uker, men ikke 12
      "3": "2026-05-01", // 120 dager – over 15 uker
    };

    const resultat = beregnNokkeltall(saker, avslutningsdatoer);

    expect(resultat.utredetInnen12Uker).toBe(33); // 1/3
    expect(resultat.utredetInnen15Uker).toBe(67); // 2/3
  });

  test("beregner gjennomsnittlig saksbehandlingstid", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "AVSLUTTET", opprettet: "2026-01-01T00:00:00Z" }),
      lagKontrollsak({ id: 2, status: "HENLAGT", opprettet: "2026-01-01T00:00:00Z" }),
    ];

    const avslutningsdatoer: Avslutningsdatoer = {
      "1": "2026-01-11", // 10 dager
      "2": "2026-01-21", // 20 dager
    };

    const resultat = beregnNokkeltall(saker, avslutningsdatoer);

    expect(resultat.gjennomsnittligSaksbehandlingstid).toBe(15);
  });

  test("returnerer 0 for prosenter og snitt når ingen saker er avsluttet", () => {
    const saker = [
      lagKontrollsak({ id: 1, status: "OPPRETTET" }),
      lagKontrollsak({ id: 2, status: "UTREDES" }),
    ];

    const resultat = beregnNokkeltall(saker, {});

    expect(resultat.utredetInnen12Uker).toBe(0);
    expect(resultat.utredetInnen15Uker).toBe(0);
    expect(resultat.gjennomsnittligSaksbehandlingstid).toBe(0);
  });

  test("håndterer tom saksliste", () => {
    const resultat = beregnNokkeltall([], {});

    expect(resultat).toEqual({
      pagaendeSaker: 0,
      paVent: 0,
      utredetInnen12Uker: 0,
      utredetInnen15Uker: 0,
      gjennomsnittligSaksbehandlingstid: 0,
    });
  });
});
