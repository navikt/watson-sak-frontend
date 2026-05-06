import { describe, expect, it, vi } from "vitest";
import { loader } from "./MineSakerSide.route";

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({
    preferredUsername: "test",
    name: "Saks Behandlersen",
    navIdent: "Z999999",
    organisasjoner: "4812",
  }),
}));

describe("MineSakerSide loader", () => {
  const loaderArgs = {
    request: new Request("http://localhost/mine-saker"),
    params: {},
    context: {},
  } as Parameters<typeof loader>[0];

  it("returnerer backend-shapede kontrollsaker for mine saker", async () => {
    const resultat = await loader(loaderArgs);

    expect(resultat.saker.length).toBeGreaterThan(0);
    expect("personIdent" in resultat.saker[0]).toBe(true);
  });

  it("returnerer bare saker eid av innlogget bruker", async () => {
    const resultat = await loader(loaderArgs);

    expect(resultat.saker.every((sak) => sak.saksbehandlere.eier?.navIdent === "Z999999")).toBe(
      true,
    );
  });
});
