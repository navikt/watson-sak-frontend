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

  it("returnerer bare aktive saker (ikke ANMELDT, HENLAGT eller AVSLUTTET)", async () => {
    const data = await loader(loaderArgs);

    const ikkeAktiveStatuser: Array<(typeof data.mineSaker)[number]["status"]> = [
      "ANMELDT",
      "HENLAGT",
      "AVSLUTTET",
    ];

    expect(data.mineSaker.every((sak) => !ikkeAktiveStatuser.includes(sak.status))).toBe(true);
  });

  it("returnerer bare saker eid av innlogget bruker i dashboardets mine saker-liste", async () => {
    const data = await loader(loaderArgs);

    expect(data.mineSaker.every((sak) => sak.saksbehandlere.eier?.navIdent === "Z999999")).toBe(
      true,
    );
  });

  it("returnerer en velkomstoppsummering basert på sakene dine", async () => {
    const data = await loader(loaderArgs);

    expect(data.velkomstOppsummering).toBe("Akkurat nå har du 28 aktive saker og 1 sak på vent.");
  });
});
