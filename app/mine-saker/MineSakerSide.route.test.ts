import { describe, expect, it } from "vitest";
import { loader } from "./MineSakerSide.route";

describe("MineSakerSide loader", () => {
  it("returnerer backend-shapede kontrollsaker for mine saker", () => {
    const resultat = loader();

    expect(resultat.saker.length).toBeGreaterThan(0);
    expect("personIdent" in resultat.saker[0]).toBe(true);
  });

  it("returnerer bare saker eid av innlogget bruker", () => {
    const resultat = loader();

    expect(resultat.saker.every((sak) => sak.saksbehandlere.eier?.navIdent === "Z999999")).toBe(
      true,
    );
  });
});
