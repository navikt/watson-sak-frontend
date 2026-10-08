import { describe, expect, test } from "vitest";
import type { LederEnhetStatistikk } from "./types";
import { lagLederVelkomstOppsummering } from "./velkomst";

function lagEnhet(oyeblikksbilde: LederEnhetStatistikk["oyeblikksbilde"]): LederEnhetStatistikk {
  return {
    totaltAntallIkkeAvsluttede: oyeblikksbilde.totalt,
    antallOverFrist: 5,
    antallUfordelte: oyeblikksbilde.ikkeFordelt,
    perSteg: {
      OPPRETTET: 0,
      UTREDNING: 0,
      FORVALTNING: 0,
      STRAFFERETTSLIG_VURDERING: 0,
      POLITI: 0,
    },
    perStatus: {
      UTEN_STATUS: 0,
      AKTIV: 0,
      VENTER_PA_INFORMASJON: 0,
      VENTER_PA_VEDTAK: 0,
      VENTER_PA_RESULTAT: 0,
      PAAKLAGET: 0,
      I_BERO: 0,
    },
    oyeblikksbilde,
  };
}

describe("lagLederVelkomstOppsummering", () => {
  test("viser egen tekst når enheten ikke har åpne saker", () => {
    expect(
      lagLederVelkomstOppsummering(
        lagEnhet({ totalt: 0, aktive: 0, venterPåAndre: 0, ikkeFordelt: 0 }),
        "Nord",
      ),
    ).toBe("Enheten Nord har ingen åpne saker akkurat nå.");
  });

  test("viser alle tre deltall fra øyeblikksbildet", () => {
    expect(
      lagLederVelkomstOppsummering(
        lagEnhet({ totalt: 42, aktive: 18, venterPåAndre: 12, ikkeFordelt: 3 }),
        "Øst",
      ),
    ).toBe("Enheten Øst har 42 åpne saker. 18 er aktive, 12 venter på andre og 3 er ikke fordelt.");
  });

  test("utelater deltall som er 0 og bruker entall", () => {
    expect(
      lagLederVelkomstOppsummering(
        lagEnhet({ totalt: 1, aktive: 1, venterPåAndre: 0, ikkeFordelt: 0 }),
        "Vest",
      ),
    ).toBe("Enheten Vest har 1 åpen sak. 1 er aktiv.");
  });

  test("viser bare totalen når ingen deltall er over 0", () => {
    expect(
      lagLederVelkomstOppsummering(
        lagEnhet({ totalt: 4, aktive: 0, venterPåAndre: 0, ikkeFordelt: 0 }),
        "Sør",
      ),
    ).toBe("Enheten Sør har 4 åpne saker.");
  });

  test("viser ikke saker over frist", () => {
    expect(
      lagLederVelkomstOppsummering(
        lagEnhet({ totalt: 2, aktive: 0, venterPåAndre: 2, ikkeFordelt: 0 }),
        "Nord",
      ),
    ).not.toContain("frist");
  });
});
