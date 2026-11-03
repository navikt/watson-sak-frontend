import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendFeilException } from "~/saker/api-core.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { action, loader } from "./kommentarer.api";
import { lagListe } from "./kommentar-fixtures";

const { mockHentKontrollsak, mockHentKommentarliste, mockOpprettKommentartraad } = vi.hoisted(
  () => ({
    mockHentKontrollsak: vi.fn(),
    mockHentKommentarliste: vi.fn(),
    mockOpprettKommentartraad: vi.fn(),
  }),
);

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
  opprettKommentartraad: mockOpprettKommentartraad,
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
    params: { sakId: "42", docId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" },
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
    expect(mockHentKommentarliste).toHaveBeenCalledWith(
      "mock-token",
      "42",
      "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    );
  });

  it("avviser vanlig saksbehandler uten direkte tilgang på aktiv sak før kommentar-API-et kalles", async () => {
    mockHentKontrollsak.mockResolvedValue(lagSak("UTREDES"));

    await expect(hent()).rejects.toMatchObject({ init: { status: 403 } });
    expect(mockHentKommentarliste).not.toHaveBeenCalled();
  });

  it("returnerer teknisk feilsvar ved backendfeil under lagring", async () => {
    mockHentKontrollsak.mockResolvedValue(lagSak("AVSLUTTET"));
    mockOpprettKommentartraad.mockRejectedValue(
      new BackendFeilException(500, "Skal ikke vises i svaret"),
    );

    const svar = (await action({
      request: new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handling: "opprett_traad",
          traadId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
          kommentarId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
          ankerType: "DOCUMENT",
          anker: {},
          tekst: "Kommentarinnhold",
        }),
      }),
      params: { sakId: "42", docId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" },
    } as never)) as {
      init?: ResponseInit;
      data?: { ok: boolean; teknisk?: boolean; feilId?: string; feil?: string };
    };

    expect(svar.init?.status).toBe(500);
    expect(svar.data).toMatchObject({ ok: false, teknisk: true });
    expect(svar.data?.feilId).toMatch(/^[0-9a-f]{8}$/);
    expect(JSON.stringify(svar.data)).not.toContain("Skal ikke vises i svaret");
    expect(JSON.stringify(svar.data)).not.toContain("Kommentarinnhold");
  });
});
