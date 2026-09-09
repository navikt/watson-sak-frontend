import { describe, expect, it, vi } from "vitest";
import { loader } from "./loader.server";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

const hentInnloggetBrukerMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    preferredUsername: "test",
    name: "Saks Behandlersen",
    navIdent: "Z999999",
    enhet: "4812",
    enhetId: "4812",
    erLeder: false,
  }),
);

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: hentInnloggetBrukerMock,
}));

describe("landingsside-loader", () => {
  const loaderArgs = {
    request: new Request("http://localhost/"),
    params: {},
    context: {},
  } as Parameters<typeof loader>[0];

  it("returnerer saksbehandler-typen (ikke leder) for en vanlig innlogget bruker", async () => {
    const data = await loader(loaderArgs);

    expect(data.type).toBe("saksbehandler");
  });

  it("returnerer leder-typen med enhetsdata for en innlogget leder", async () => {
    hentInnloggetBrukerMock.mockResolvedValueOnce({
      preferredUsername: "leder",
      name: "Leder Ledersen",
      navIdent: "Z888888",
      enhet: "Nord",
      enhetId: "hu424t",
      erLeder: true,
    });

    const data = await loader(loaderArgs);
    if (data.type !== "leder") throw new Error("Forventet lederdata");

    expect(data.type).toBe("leder");
    expect(data.statistikk.enhetId).toBe("hu424t");
    expect(data.statistikk.enhetNavn).toBe("Nord");
    expect(data.statistikk.ansatte.liste.length).toBeGreaterThan(0);
    expect(typeof data.velkomstOppsummering).toBe("string");
  });

  it("returnerer bare aktive saker (ikke ANMELDT, HENLAGT eller AVSLUTTET)", async () => {
    const data = await loader(loaderArgs);
    if (data.type !== "saksbehandler") throw new Error("Forventet saksbehandler-data");

    const ikkeAktiveStatuser: Array<(typeof data.mineSaker)[number]["status"]> = [
      "ANMELDT",
      "HENLAGT",
      "AVSLUTTET",
    ];

    expect(data.mineSaker.every((sak) => !ikkeAktiveStatuser.includes(sak.status))).toBe(true);
  });

  it("returnerer bare saker eid av innlogget bruker i dashboardets mine saker-liste", async () => {
    const data = await loader(loaderArgs);
    if (data.type !== "saksbehandler") throw new Error("Forventet saksbehandler-data");

    expect(data.mineSaker.every((sak) => sak.saksbehandlere.eier?.navIdent === "Z999999")).toBe(
      true,
    );
  });

  it("returnerer en velkomstoppsummering basert på sakene dine", async () => {
    const data = await loader(loaderArgs);
    if (data.type !== "saksbehandler") throw new Error("Forventet saksbehandler-data");

    expect(data.velkomstOppsummering).toBe("Akkurat nå har du 28 aktive saker og 1 sak på vent.");
  });
});
