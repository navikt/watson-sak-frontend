import { beforeEach, describe, expect, it } from "vitest";
import { resetMockSaker } from "~/fordeling/mock-data.server";
import { resetMockMineSaker } from "~/mine-saker/mock-data.server";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import { søkSaker } from "./søk.server";

describe("søkSaker", () => {
  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
  });

  it("finner backend-shapet kontrollsak på personIdent", () => {
    const resultater = søkSaker("11223344556");

    expect(resultater.some((sak) => sak.id === lagMockSakUuid("201", 2))).toBe(true);
  });

  it("finner ikke lenger saker på utredningsresultat/beskrivelse", () => {
    const resultater = søkSaker("Mulig dobbeltutbetaling av dagpenger");

    expect(resultater.some((sak) => sak.id === lagMockSakUuid("201", 2))).toBe(false);
  });

  it("beholder søk på ytelse for eksisterende brukerflyt", () => {
    const resultater = søkSaker("dagpenger");

    expect(resultater.length).toBeGreaterThan(0);
  });

  it("finner bare én backend-shapet sak på saksnummer etter migreringen", () => {
    const resultater = søkSaker("101");

    expect(resultater.map((sak) => sak.id)).toEqual([lagMockSakUuid("101", 1)]);
  });
});
