import { describe, expect, test } from "vitest";
import { lagLederVelkomstOppsummering } from "./velkomst";

describe("lagLederVelkomstOppsummering", () => {
  const fordelinger = {
    perStatus: {
      OPPRETTET: 0,
      UTREDES: 0,
      STRAFFERETTSLIG_VURDERING: 0,
      ANMELDT: 0,
      HENLAGT: 0,
    },
    perArbeidsstatus: {
      IKKE_BLOKKERT: 0,
      VENTER_PA_INFORMASJON: 0,
      VENTER_PA_VEDTAK: 0,
      I_BERO: 0,
    },
  };

  test("viser en oppmuntrende tekst når enheten ikke har aktive saker", () => {
    expect(
      lagLederVelkomstOppsummering(
        {
          totaltAntallIkkeAvsluttede: 0,
          antallOverFrist: 0,
          antallUfordelte: 0,
          ...fordelinger,
        },
        "Nord",
      ),
    ).toBe("Enheten Nord har ingen aktive saker akkurat nå.");
  });

  test("oppsummerer kun aktive saker når ingenting er over frist eller ufordelt", () => {
    expect(
      lagLederVelkomstOppsummering(
        {
          totaltAntallIkkeAvsluttede: 12,
          antallOverFrist: 0,
          antallUfordelte: 0,
          ...fordelinger,
        },
        "Nord",
      ),
    ).toBe("Enheten Nord har 12 aktive saker akkurat nå.");
  });

  test("inkluderer over frist og ufordelte saker når det finnes", () => {
    expect(
      lagLederVelkomstOppsummering(
        {
          totaltAntallIkkeAvsluttede: 12,
          antallOverFrist: 3,
          antallUfordelte: 2,
          ...fordelinger,
        },
        "Nord",
      ),
    ).toBe("Enheten Nord har 12 aktive saker, 3 saker over frist og 2 ufordelte saker akkurat nå.");
  });

  test("bruker entallsform når det kun er én av hver kategori", () => {
    expect(
      lagLederVelkomstOppsummering(
        {
          totaltAntallIkkeAvsluttede: 1,
          antallOverFrist: 1,
          antallUfordelte: 1,
          ...fordelinger,
        },
        "Nord",
      ),
    ).toBe("Enheten Nord har 1 aktiv sak, 1 sak over frist og 1 ufordelt sak akkurat nå.");
  });
});
