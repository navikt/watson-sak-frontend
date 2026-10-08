import { describe, expect, test } from "vitest";
import { lagVelkomstOppsummering } from "./velkomst";

const tom = { nye: 0, aktive: 0, venter: 0, iBero: 0 };

describe("lagVelkomstOppsummering", () => {
  test("viser de to største kategoriene, størst først", () => {
    expect(lagVelkomstOppsummering({ nye: 1, aktive: 2, venter: 3, iBero: 0 })).toBe(
      "Akkurat nå har du 3 saker på vent og 2 aktive saker.",
    );
  });

  test("bruker entall og utelater kategorier uten saker", () => {
    expect(lagVelkomstOppsummering({ ...tom, nye: 1 })).toBe("Akkurat nå har du 1 ny sak.");
  });

  test("viser saker i bero", () => {
    expect(lagVelkomstOppsummering({ ...tom, aktive: 1, iBero: 2 })).toBe(
      "Akkurat nå har du 2 saker i bero og 1 aktiv sak.",
    );
  });

  test("viser en oppmuntrende tekst når brukeren ikke har åpne saker", () => {
    expect(lagVelkomstOppsummering(tom)).toBe(
      "Er du klar for nye oppgaver? Du har ingen saker hos deg akkurat nå.",
    );
  });
});
