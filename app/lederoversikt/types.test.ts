import { describe, expect, it } from "vitest";
import { lederStatistikkResponseSchema } from "./types";

const gyldigRespons = {
  enhetId: "hu424t",
  enhetNavn: "Nord",
  enhet: {
    totaltAntallIkkeAvsluttede: 5,
    antallOverFrist: 1,
    antallUfordelte: 2,
    perStatus: {
      OPPRETTET: 1,
      UTREDES: 1,
      STRAFFERETTSLIG_VURDERING: 1,
      ANMELDT: 1,
      HENLAGT: 1,
    },
    perArbeidsstatus: {
      IKKE_BLOKKERT: 2,
      VENTER_PA_INFORMASJON: 1,
      VENTER_PA_VEDTAK: 1,
      I_BERO: 1,
    },
  },
  ansatte: {
    tilgjengelig: true,
    liste: [
      {
        navn: "Ada Ansatt",
        navIdent: "Z000001",
        totaltAntallIkkeAvsluttede: 0,
        antallOverFrist: 0,
      },
    ],
    ufordelt: {
      totaltAntallIkkeAvsluttede: 2,
      antallOverFrist: 1,
    },
  },
};

describe("lederStatistikkResponseSchema", () => {
  it("godtar komplett lederstatistikk med ansatte uten saker", () => {
    expect(lederStatistikkResponseSchema.parse(gyldigRespons)).toEqual(gyldigRespons);
  });

  it("krever alle aktive statuser og arbeidsstatuser", () => {
    expect(
      lederStatistikkResponseSchema.safeParse({
        ...gyldigRespons,
        enhet: {
          ...gyldigRespons.enhet,
          perStatus: { OPPRETTET: 5 },
        },
      }).success,
    ).toBe(false);
  });
});
