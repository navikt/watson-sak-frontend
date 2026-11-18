import { describe, expect, it } from "vitest";
import { lederStatistikkResponseSchema } from "./types";

const gyldigRespons = {
  enhetId: "hu424t",
  enhetNavn: "Nord",
  enhet: {
    totaltAntallIkkeAvsluttede: 5,
    antallOverFrist: 1,
    antallUfordelte: 2,
    oyeblikksbilde: { totalt: 0, nye: 0, aktive: 0, venterPåAndre: 0, ikkeFordelt: 0 },
    perSteg: {
      OPPRETTET: 1,
      UTREDNING: 1,
      FORVALTNING: 0,
      STRAFFERETTSLIG_VURDERING: 1,
      POLITI: 1,
    },
    perStatus: {
      UTEN_STATUS: 2,
      AKTIV: 0,
      VENTER_PA_INFORMASJON: 1,
      VENTER_PA_VEDTAK: 1,
      VENTER_PA_RESULTAT: 0,
      PAAKLAGET: 0,
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
        antallAktive: 0,
        antallAktiveOverFrist: 0,
      },
      {
        navn: "Test Z993376",
        navIdent: "Z993376",
        erOpplaeringsbruker: true,
        totaltAntallIkkeAvsluttede: 0,
        antallOverFrist: 0,
        antallAktive: 0,
        antallAktiveOverFrist: 0,
      },
      {
        navn: "Test Z993471",
        navIdent: "Z993471",
        totaltAntallIkkeAvsluttede: 0,
        antallOverFrist: 0,
        antallAktive: 0,
        antallAktiveOverFrist: 0,
      },
    ],
    ufordelt: {
      totaltAntallIkkeAvsluttede: 2,
      antallOverFrist: 1,
      antallAktive: 0,
      antallAktiveOverFrist: 0,
    },
  },
};

describe("lederStatistikkResponseSchema", () => {
  it("parser backendnavn og ignorerer det foreldede opplæringsflagget", () => {
    const resultat = lederStatistikkResponseSchema.parse(gyldigRespons);

    expect(resultat).toMatchObject({
      ansatte: {
        liste: [
          { navIdent: "Z000001", navn: "Ada Ansatt" },
          { navIdent: "Z993376", navn: "Test Z993376" },
          { navIdent: "Z993471", navn: "Test Z993471" },
        ],
      },
      ledetEnheter: [],
    });
    expect(resultat.ansatte.liste[1]).not.toHaveProperty("erOpplaeringsbruker");
  });

  it("parser svar uten UTEN_STATUS fra ny backend", () => {
    const { UTEN_STATUS: utenStatus, ...perStatus } = gyldigRespons.enhet.perStatus;
    expect(utenStatus).toBe(2);
    const resultat = lederStatistikkResponseSchema.parse({
      ...gyldigRespons,
      enhet: { ...gyldigRespons.enhet, perStatus },
    });

    expect(resultat.enhet.perStatus).not.toHaveProperty("UTEN_STATUS");
  });

  it("krever alle aktive steg og statuser", () => {
    expect(
      lederStatistikkResponseSchema.safeParse({
        ...gyldigRespons,
        enhet: {
          ...gyldigRespons.enhet,
          perSteg: { OPPRETTET: 5 },
        },
      }).success,
    ).toBe(false);
  });
});
