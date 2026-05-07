import { beforeEach, describe, expect, it } from "vitest";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import { søkSaker } from "./søk.server";

const testRequest = new Request("http://localhost");

describe("søkSaker", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("finner backend-shapet kontrollsak på personIdent", () => {
    const resultater = søkSaker(testRequest, "11223344556");

    expect(resultater.some((sak) => sak.id === lagMockSakUuid("201", 2))).toBe(true);
  });

  it("finner backend-shapet kontrollsak på kategori", () => {
    const resultater = søkSaker(testRequest, "Arbeid");

    expect(resultater.some((sak) => sak.id === lagMockSakUuid("201", 2))).toBe(true);
  });

  it("beholder søk på ytelse for eksisterende brukerflyt", () => {
    const resultater = søkSaker(testRequest, "dagpenger");

    expect(resultater.length).toBeGreaterThan(0);
  });

  it("finner bare én backend-shapet sak på saksnummer etter migreringen", () => {
    const resultater = søkSaker(testRequest, "101");

    expect(resultater.map((sak) => sak.id)).toEqual([lagMockSakUuid("101", 1)]);
  });
});
