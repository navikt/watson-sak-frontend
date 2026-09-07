import { describe, expect, test } from "vitest";
import { lagLederVelkomstOppsummering } from "./velkomst";

describe("lagLederVelkomstOppsummering", () => {
  test("viser en oppmuntrende tekst når enheten ikke har åpne saker", () => {
    expect(
      lagLederVelkomstOppsummering(
        { antallÅpneSaker: 0, antallOverFrist: 0, antallUfordelte: 0 },
        "Nord",
      ),
    ).toBe("Enheten Nord har ingen åpne saker akkurat nå.");
  });

  test("oppsummerer kun åpne saker når ingenting er over frist eller ufordelt", () => {
    expect(
      lagLederVelkomstOppsummering(
        { antallÅpneSaker: 12, antallOverFrist: 0, antallUfordelte: 0 },
        "Nord",
      ),
    ).toBe("Enheten Nord har 12 åpne saker akkurat nå.");
  });

  test("inkluderer over frist og ufordelte saker når det finnes", () => {
    expect(
      lagLederVelkomstOppsummering(
        { antallÅpneSaker: 12, antallOverFrist: 3, antallUfordelte: 2 },
        "Nord",
      ),
    ).toBe("Enheten Nord har 12 åpne saker, 3 saker over frist og 2 ufordelte saker akkurat nå.");
  });

  test("bruker entallsform når det kun er én av hver kategori", () => {
    expect(
      lagLederVelkomstOppsummering(
        { antallÅpneSaker: 1, antallOverFrist: 1, antallUfordelte: 1 },
        "Nord",
      ),
    ).toBe("Enheten Nord har 1 åpen sak, 1 sak over frist og 1 ufordelt sak akkurat nå.");
  });
});
