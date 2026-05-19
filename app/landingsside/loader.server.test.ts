import { describe, expect, it, vi } from "vitest";
import { loader } from "./loader.server";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({
    preferredUsername: "test",
    name: "Saks Behandlersen",
    navIdent: "Z999999",
    enhet: "4812",
  }),
}));

describe("landingsside-loader", () => {
  const loaderArgs = {
    request: new Request("http://localhost/"),
    params: {},
    context: {},
  } as Parameters<typeof loader>[0];

  it("returnerer alle uleste varsler sortert nyest først", async () => {
    const data = await loader(loaderArgs);

    expect(data.varsler).toHaveLength(7);
    expect(data.varsler.map((varsel) => varsel.id)).toEqual([
      "varsel-107",
      "varsel-106",
      "varsel-105",
      "varsel-104",
      "varsel-103",
      "varsel-102",
      "varsel-101",
    ]);
    expect(data.varsler.every((varsel) => !varsel.erLest)).toBe(true);
  });

  it("returnerer traktSteg for brukerens saker", async () => {
    const data = await loader(loaderArgs);

    expect(data.traktSteg).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: expect.any(String), antall: expect.any(Number) }),
      ]),
    );
  });

  it("returnerer kun aktive saker (ikke avsluttede)", async () => {
    const data = await loader(loaderArgs);

    expect(data.mineSaker.every((sak) => sak.status !== "AVSLUTTET")).toBe(true);
  });

  it("returnerer bare saker eid av innlogget bruker i dashboardets mine saker-liste", async () => {
    const data = await loader(loaderArgs);

    expect(data.mineSaker.every((sak) => sak.saksbehandlere.eier?.navIdent === "Z999999")).toBe(
      true,
    );
  });

  it("returnerer en velkomstoppsummering basert på sakene dine", async () => {
    const data = await loader(loaderArgs);

    expect(data.velkomstOppsummering).toBe("Akkurat nå har du 5 aktive saker og 1 sak på vent.");
  });
});
