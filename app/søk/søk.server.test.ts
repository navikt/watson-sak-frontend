import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import { søkSaker } from "./søk.server";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: true,
}));

const testRequest = new Request("http://localhost");

describe("søkSaker", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("finner backend-shapet kontrollsak på personIdent", async () => {
    const resultater = await søkSaker(testRequest, "11223344556");

    expect(resultater.some((sak) => sak.id === 201)).toBe(true);
  });

  it("finner backend-shapet kontrollsak på kategori", async () => {
    const resultater = await søkSaker(testRequest, "Arbeid");

    expect(resultater.some((sak) => sak.id === 201)).toBe(true);
  });

  it("beholder søk på ytelse for eksisterende brukerflyt", async () => {
    const resultater = await søkSaker(testRequest, "dagpenger");

    expect(resultater.length).toBeGreaterThan(0);
  });

  it("finner bare én backend-shapet sak på saksnummer etter migreringen", async () => {
    const resultater = await søkSaker(testRequest, "101");

    expect(resultater.map((sak) => sak.id)).toEqual([101]);
  });
});
