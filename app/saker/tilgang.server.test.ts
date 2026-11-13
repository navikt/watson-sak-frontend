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

  it("gir alle filtilgang og opplasting, men ikke endring, på en ufordelt sak", async () => {
    const tilgang = await hentSakstilgangFraMock(new Request("http://localhost"), "102");

    expect(tilgang).not.toBeNull();
    expect(tilgang?.sak.saksbehandlere.eier).toBeFalsy();
    expect(tilgang?.kanSeFiler).toBe(true);
    expect(tilgang?.kanLasteOppFiler).toBe(true);
    expect(tilgang?.kanEndreFiler).toBe(false);
    expect(tilgang?.kanSe).toBe(false);
    expect(tilgang?.kanRedigereDokumenter).toBe(false);
  });

  it("gir ikke lesebruker skriveadgang til egen sak", async () => {
    mockHentInnloggetBruker.mockResolvedValue({
      preferredUsername: "leder",
      name: "Leder",
      navIdent: "Z999999",
      enhet: "4812",
      enhetId: "4812",
      erLeder: true,
      erLesebruker: true,
    });

    const tilgang = await hentSakstilgangFraMock(new Request("http://localhost"), "201");

    expect(tilgang?.kanSe).toBe(true);
    expect(tilgang?.kanRedigereDokumenter).toBe(false);
    expect(tilgang?.kanLasteOppFiler).toBe(false);
    expect(tilgang?.kanEndreFiler).toBe(false);
  });
});
