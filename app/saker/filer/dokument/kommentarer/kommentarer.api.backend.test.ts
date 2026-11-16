import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendFeilException } from "~/saker/api-core.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { action, loader } from "./kommentarer.api";
import { lagListe } from "./kommentar-fixtures";
import { kommentarlisteKlientSchema, kommentarlisteSchema } from "./typer";

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

describe("navnevisning for opplæringsbrukere i kommentarresponsen", () => {
  it("bevarer navn gjennom backend- og klientskjemaene uten å miste gamle overstyringer", () => {
    const backendListe = {
      dokumentId: "d1",
      kanKommentere: true,
      traader: [
        {
          id: "traad-opplaering",
          dokumentId: "d1",
          ankerType: "DOCUMENT",
          anker: {},
          opprettetAvIdent: "Z993376",
          opprettetAvNavn: "Backendnavn Petter",
          opprettetAvErOpplaeringsbruker: true,
          opprettet: "2026-01-01T10:00:00Z",
          resolved: "2026-01-02T10:00:00Z",
          resolvedAvIdent: "Z990778",
          resolvedAvNavn: "Backendnavn Kari",
          resolvedAvErOpplaeringsbruker: true,
          kommentarer: [
            {
              id: "kommentar-opplaering",
              traadId: "traad-opplaering",
              tekst: "Kommentar",
              forfatterIdent: "Z993471",
              forfatterNavn: "Backendnavn Wenche",
              forfatterErOpplaeringsbruker: true,
              opprettet: "2026-01-01T10:00:00Z",
              endret: "2026-01-01T10:00:00Z",
            },
          ],
        },
        {
          id: "traad-eldre",
          dokumentId: "d1",
          ankerType: "DOCUMENT",
          anker: {},
          opprettetAvIdent: "Z993376",
          opprettetAvNavn: "Test Z993376",
          opprettet: "2026-01-03T10:00:00Z",
          resolved: "2026-01-04T10:00:00Z",
          resolvedAvIdent: "Z990778",
          resolvedAvNavn: "Test Z990778",
          resolvedAvErOpplaeringsbruker: false,
          kommentarer: [
            {
              id: "kommentar-eldre",
              traadId: "traad-eldre",
              tekst: "Eldre kommentar",
              forfatterIdent: "Z993471",
              forfatterNavn: "Test Z993471",
              opprettet: "2026-01-03T10:00:00Z",
              endret: "2026-01-03T10:00:00Z",
            },
          ],
        },
      ],
    };

    const backendParset = kommentarlisteSchema.parse(backendListe);
    expect(backendParset.traader[0]).toMatchObject({
      opprettetAvNavn: "Backendnavn Petter",
      opprettetAvErOpplaeringsbruker: true,
      resolvedAvNavn: "Backendnavn Kari",
      resolvedAvErOpplaeringsbruker: true,
      kommentarer: [
        {
          forfatterNavn: "Backendnavn Wenche",
          forfatterErOpplaeringsbruker: true,
        },
      ],
    });
    expect(backendParset.traader[1]).toMatchObject({
      opprettetAvNavn: "Petter Øst",
      resolvedAvNavn: "Kari Ledersen Øst",
      resolvedAvErOpplaeringsbruker: false,
      kommentarer: [{ forfatterNavn: "Wenche Vest" }],
    });

    const klientListe = kommentarlisteKlientSchema.parse(JSON.parse(JSON.stringify(backendParset)));
    expect(klientListe.traader[0]).toMatchObject({
      opprettetAvNavn: "Backendnavn Petter",
      opprettetAvErOpplaeringsbruker: true,
      resolvedAvNavn: "Backendnavn Kari",
      resolvedAvErOpplaeringsbruker: true,
      kommentarer: [
        {
          forfatterNavn: "Backendnavn Wenche",
          forfatterErOpplaeringsbruker: true,
        },
      ],
    });
    expect(klientListe.traader[1]).toMatchObject({
      opprettetAvNavn: "Petter Øst",
      resolvedAvNavn: "Kari Ledersen Øst",
      kommentarer: [{ forfatterNavn: "Wenche Vest" }],
    });
  });
});
