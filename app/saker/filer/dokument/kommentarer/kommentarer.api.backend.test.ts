import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { loader } from "./kommentarer.api";
import { lagListe } from "./kommentar-fixtures";

const { mockHentKontrollsak, mockHentKommentarliste } = vi.hoisted(() => ({
  mockHentKontrollsak: vi.fn(),
  mockHentKommentarliste: vi.fn(),
}));

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: false,
  env: { ENVIRONMENT: "dev" },
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    erLeder: false,
  }),
}));

vi.mock("~/saker/api.server", () => ({
  hentKontrollsak: mockHentKontrollsak,
}));

vi.mock("./kommentarer.api.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./kommentarer.api.server")>()),
  hentKommentarliste: mockHentKommentarliste,
}));

function lagSak(steg: string): KontrollsakResponse {
  return {
    id: 42,
    steg,
    saksbehandlere: {
      eier: steg === "AVSLUTTET" ? null : { navIdent: "Z111111", navn: "Annen", enhet: "4812" },
      deltMed: [],
    },
  } as unknown as KontrollsakResponse;
}

async function hent() {
  return (await loader({
    request: new Request("http://localhost"),
    params: { sakId: "SAK-42", docId: "d1" },
  } as never)) as Response;
}

describe("kommentarer.api loader — backend-modus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHentKommentarliste.mockResolvedValue(lagListe());
  });

  it("slipper vanlig saksbehandler uten direkte tilgang gjennom på avsluttet sak", async () => {
    mockHentKontrollsak.mockResolvedValue(lagSak("AVSLUTTET"));

    const respons = await hent();

    expect(respons.status).toBe(200);
    expect(mockHentKommentarliste).toHaveBeenCalledWith("mock-token", "SAK-42", "d1");
  });

  it("avviser vanlig saksbehandler uten direkte tilgang på aktiv sak før kommentar-API-et kalles", async () => {
    mockHentKontrollsak.mockResolvedValue(lagSak("UTREDES"));

    await expect(hent()).rejects.toMatchObject({ init: { status: 403 } });
    expect(mockHentKommentarliste).not.toHaveBeenCalled();
  });
});
