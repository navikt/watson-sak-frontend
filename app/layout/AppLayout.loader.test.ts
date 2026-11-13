import { beforeEach, describe, expect, it, vi } from "vitest";
import { data, redirect, RouterContextProvider } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { hentUlesteVarsler } from "~/varsler/api.server";
import { loader } from "./AppLayout";

vi.mock("~/auth/access-token", () => ({ getBackendOboToken: vi.fn() }));
vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({ erLesebruker: false }),
}));
vi.mock("~/config/env.server", () => ({ skalBrukeMockdata: false }));
vi.mock("~/logging/logging", () => ({ logger: { warn: vi.fn() } }));
vi.mock("~/varsler/api.server", () => ({ hentUlesteVarsler: vi.fn() }));
vi.mock("~/varsler/mock-data.server", () => ({ hentUlesteVarsler: vi.fn() }));
vi.mock("./AppHeader", () => ({ AppHeader: () => null }));
vi.mock("./AppFooter", () => ({ AppFooter: () => null }));
vi.mock("./AppSidebar", () => ({ AppSidebar: () => null }));
vi.mock("./InfoBanner", () => ({ InfoBanner: () => null }));

const args = () => ({
  request: new Request("https://watson.example/"),
  url: new URL("https://watson.example/"),
  pattern: "/",
  params: {},
  context: new RouterContextProvider(),
});

describe("layout-loaderens autentisering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBackendOboToken).mockResolvedValue("obo-token");
  });

  it("bevarer innloggingsredirect fra tokenhjelperen", async () => {
    const feil = redirect("/oauth2/login");
    vi.mocked(getBackendOboToken).mockRejectedValue(feil);
    await expect(loader(args())).rejects.toBe(feil);
    expect(hentUlesteVarsler).not.toHaveBeenCalled();
  });

  it("henter ikke varsler for lesebruker", async () => {
    vi.mocked(hentInnloggetBruker).mockResolvedValueOnce({
      preferredUsername: "test",
      name: "Test",
      navIdent: "Z123456",
      enhet: "Øst",
      enhetId: "ky153k",
      erLeder: false,
      erLesebruker: true,
    });
    await expect(loader(args())).resolves.toEqual({ varsler: [] });
    expect(hentUlesteVarsler).not.toHaveBeenCalled();
  });

  it("bevarer 401 fra backend", async () => {
    const feil = data("Sesjonen er utløpt", { status: 401 });
    vi.mocked(hentUlesteVarsler).mockRejectedValue(feil);
    await expect(loader(args())).rejects.toBe(feil);
  });

  it("beholder tom varselliste ved andre feil", async () => {
    vi.mocked(hentUlesteVarsler).mockRejectedValue(new Error("Backend er utilgjengelig"));
    await expect(loader(args())).resolves.toEqual({ varsler: [] });
  });
});
