import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import { hentSakstilgangFraMock } from "./tilgang.server";

const { mockHentInnloggetBruker } = vi.hoisted(() => ({
  mockHentInnloggetBruker: vi.fn(),
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: mockHentInnloggetBruker,
}));

describe("hentSakstilgangFraMock", () => {
  beforeEach(() => {
    resetDefaultSession();
    mockHentInnloggetBruker.mockResolvedValue({
      preferredUsername: "leder",
      name: "Leder",
      navIdent: "Z999999",
      enhet: "4812",
      enhetId: "4812",
      erLeder: true,
    });
  });

  it("gir leder tilgang til dokumenter på en aktiv sak uten direkte tilgang", async () => {
    const tilgang = await hentSakstilgangFraMock(new Request("http://localhost"), "102");

    expect(tilgang).not.toBeNull();
    expect(tilgang?.kanSe).toBe(true);
    expect(tilgang?.kanRedigereDokumenter).toBe(true);
  });
});
