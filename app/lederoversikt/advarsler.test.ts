import { describe, expect, test } from "vitest";
import { lagLederAdvarsler } from "./advarsler";

describe("lagLederAdvarsler", () => {
  test("returnerer ingen advarsler når alt er innenfor frist og fordelt", () => {
    expect(
      lagLederAdvarsler({ antallÅpneSaker: 5, antallOverFrist: 0, antallUfordelte: 0 }, "hu424t"),
    ).toEqual([]);
  });

  test("varsler om saker over frist med lenke til alle saker filtrert på enhet", () => {
    const advarsler = lagLederAdvarsler(
      { antallÅpneSaker: 5, antallOverFrist: 3, antallUfordelte: 0 },
      "hu424t",
    );

    expect(advarsler).toHaveLength(1);
    expect(advarsler[0]).toMatchObject({
      id: "over-frist",
      tekst: "3 saker er over frist – ikke oppdatert på over 30 dager.",
    });
    expect(advarsler[0].lenke.to).toBe("/alle-saker?enhet=hu424t&sorter=oppdatert&retning=asc");
  });

  test("varsler om ufordelte saker med lenke til fordeling", () => {
    const advarsler = lagLederAdvarsler(
      { antallÅpneSaker: 5, antallOverFrist: 0, antallUfordelte: 1 },
      "hu424t",
    );

    expect(advarsler).toHaveLength(1);
    expect(advarsler[0]).toMatchObject({
      id: "ufordelte",
      tekst: "1 ufordelt sak venter på tildeling i enheten.",
    });
    expect(advarsler[0].lenke.to).toBe("/fordeling");
  });

  test("kan vise begge advarslene samtidig", () => {
    const advarsler = lagLederAdvarsler(
      { antallÅpneSaker: 5, antallOverFrist: 2, antallUfordelte: 4 },
      "hu424t",
    );

    expect(advarsler.map((a) => a.id)).toEqual(["over-frist", "ufordelte"]);
  });
});
