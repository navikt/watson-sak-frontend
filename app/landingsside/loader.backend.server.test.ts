import { data } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loader } from "./loader.server";

vi.mock("~/config/env.server", () => ({ skalBrukeMockdata: false }));
vi.mock("~/auth/access-token", () => ({ getBackendOboToken: vi.fn().mockResolvedValue("token") }));
vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({
    name: "Saks Behandlersen",
    navIdent: "Z999999",
    erLeder: false,
  }),
}));
vi.mock("~/logging/logging", () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));
vi.mock("~/fordeling/api.server", () => ({
  hentKontrollsaker: vi.fn().mockResolvedValue({ items: [] }),
}));

const hentOppsummeringMock = vi.hoisted(() => vi.fn());
vi.mock("./api.server", () => ({ hentMineSakerOppsummering: hentOppsummeringMock }));

const args = {
  request: new Request("http://localhost/"),
  params: {},
  context: {},
} as Parameters<typeof loader>[0];

describe("landingsside-loader mot backend", () => {
  afterEach(() => hentOppsummeringMock.mockReset());

  it("bruker oppsummeringen fra backend i velkomstteksten", async () => {
    hentOppsummeringMock.mockResolvedValue({ nye: 0, aktive: 2, venter: 0, iBero: 0 });

    const resultat = await loader(args);
    if (resultat.type !== "saksbehandler") throw new Error("Forventet saksbehandler");

    expect(resultat.velkomstOppsummering).toBe("Akkurat nå har du 2 aktive saker.");
  });

  it("laster siden uten oppsummering når oppsummeringen feiler", async () => {
    hentOppsummeringMock.mockRejectedValue(new Error("Kunne ikke hente oppsummering"));

    const resultat = await loader(args);
    if (resultat.type !== "saksbehandler") throw new Error("Forventet saksbehandler");

    expect(resultat.velkomstOppsummering).toBeNull();
    expect(resultat.mineSaker).toEqual([]);
  });

  it("sender utløpt sesjon videre", async () => {
    hentOppsummeringMock.mockRejectedValue(data("Sesjonen er utløpt.", { status: 401 }));

    await expect(loader(args)).rejects.toMatchObject({ init: { status: 401 } });
  });
});
