/**
 * Tester for BFF-ruten for mapper mot backend (skalBrukeMockdata: false): tilgangssjekk,
 * hvilken backendfunksjon som kalles, og hvordan backendfeil mappes.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class BackendFeilException extends Error {
    constructor(
      public readonly status: number,
      message: string,
    ) {
      super(message);
      this.name = "BackendFeilException";
    }
  }
  return {
    BackendFeilException,
    hentKontrollsak: vi.fn(),
    opprettMappe: vi.fn(),
    endreMappe: vi.fn(),
    slettMappe: vi.fn(),
    flyttDokumentTilMappe: vi.fn(),
    flyttFilTilMappe: vi.fn(),
    hentInnloggetBruker: vi.fn(),
  };
});

vi.mock("~/config/env.server", () => ({ skalBrukeMockdata: false }));
vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("token"),
}));
vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: mocks.hentInnloggetBruker,
}));
vi.mock("~/saker/api.server", () => ({
  BackendFeilException: mocks.BackendFeilException,
  hentKontrollsak: mocks.hentKontrollsak,
  opprettMappe: mocks.opprettMappe,
  endreMappe: mocks.endreMappe,
  slettMappe: mocks.slettMappe,
  flyttDokumentTilMappe: mocks.flyttDokumentTilMappe,
  flyttFilTilMappe: mocks.flyttFilTilMappe,
}));

const { action } = await import("./mapper.api");

const saksbehandler = { navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" };

function lagSak({
  eier = saksbehandler,
  deltMed = [] as (typeof saksbehandler)[],
  steg = "UTREDES",
}) {
  return {
    id: 1,
    steg,
    saksbehandlere: { eier, deltMed, opprettetAv: saksbehandler },
  };
}

function innlogget(overstyr: Partial<{ navIdent: string; erLeder: boolean }> = {}) {
  return { navIdent: "Z999999", name: "Saks Behandlersen", erLeder: false, ...overstyr };
}

async function send(body: unknown) {
  const request = new Request("http://localhost/api/saker/1/mapper", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return action({ request, params: { sakId: "1" }, context: {} } as never);
}

async function statusFraKastet(løfte: Promise<unknown>) {
  const kastet = await løfte.then(
    () => null,
    (feil: unknown) => feil,
  );
  return (kastet as { init?: { status?: number } } | null)?.init?.status;
}

describe("mapper.api mot backend", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [{ handling: "opprett", sti: "Bank" }, mocks.opprettMappe, ["token", "1", "Bank"]],
    [
      { handling: "endre", fraSti: "Bank", tilSti: "Arkiv/Bank" },
      mocks.endreMappe,
      ["token", "1", "Bank", "Arkiv/Bank"],
    ],
    [{ handling: "slett", sti: "Bank" }, mocks.slettMappe, ["token", "1", "Bank"]],
    [
      { handling: "flytt-dokument", id: "dok-1", mappe: "Bank" },
      mocks.flyttDokumentTilMappe,
      ["token", "1", "dok-1", "Bank"],
    ],
    [
      { handling: "flytt-fil", id: "fil-1", mappe: null },
      mocks.flyttFilTilMappe,
      ["token", "1", "fil-1", null],
    ],
  ])("sender %o til riktig backendfunksjon", async (body, funksjon, argumenter) => {
    mocks.hentKontrollsak.mockResolvedValue(lagSak({}));
    mocks.hentInnloggetBruker.mockResolvedValue(innlogget());

    const svar = await send(body);

    expect(svar).toEqual({ ok: true });
    expect(funksjon).toHaveBeenCalledWith(...argumenter);
  });

  it("gir 403 når brukeren ikke har direkte tilgang til saken", async () => {
    mocks.hentKontrollsak.mockResolvedValue(
      lagSak({ eier: { ...saksbehandler, navIdent: "Z111111" } }),
    );
    mocks.hentInnloggetBruker.mockResolvedValue(innlogget());

    expect(await statusFraKastet(send({ handling: "opprett", sti: "Bank" }))).toBe(403);
    expect(mocks.opprettMappe).not.toHaveBeenCalled();
  });

  it("gir tilgang når saken er delt med brukeren", async () => {
    mocks.hentKontrollsak.mockResolvedValue(
      lagSak({ eier: { ...saksbehandler, navIdent: "Z111111" }, deltMed: [saksbehandler] }),
    );
    mocks.hentInnloggetBruker.mockResolvedValue(innlogget());

    expect(await send({ handling: "opprett", sti: "Bank" })).toEqual({ ok: true });
  });

  it("gir tilgang til ledere", async () => {
    mocks.hentKontrollsak.mockResolvedValue(
      lagSak({ eier: { ...saksbehandler, navIdent: "Z111111" } }),
    );
    mocks.hentInnloggetBruker.mockResolvedValue(innlogget({ erLeder: true }));

    expect(await send({ handling: "opprett", sti: "Bank" })).toEqual({ ok: true });
  });

  it("gir 403 når saken er avsluttet", async () => {
    mocks.hentKontrollsak.mockResolvedValue(lagSak({ steg: "AVSLUTTET" }));
    mocks.hentInnloggetBruker.mockResolvedValue(innlogget());

    expect(await statusFraKastet(send({ handling: "opprett", sti: "Bank" }))).toBe(403);
  });

  it.each([400, 404, 409])("returnerer meldingen fra backend ved %i", async (status) => {
    mocks.hentKontrollsak.mockResolvedValue(lagSak({}));
    mocks.hentInnloggetBruker.mockResolvedValue(innlogget());
    mocks.slettMappe.mockRejectedValue(
      new mocks.BackendFeilException(status, "Mappen er ikke tom"),
    );

    const svar = (await send({ handling: "slett", sti: "Bank" })) as {
      data: unknown;
      init: { status: number };
    };

    expect(svar.init.status).toBe(status);
    expect(svar.data).toEqual({ ok: false, melding: "Mappen er ikke tom" });
  });

  it("kaster andre backendfeil videre", async () => {
    mocks.hentKontrollsak.mockResolvedValue(lagSak({}));
    mocks.hentInnloggetBruker.mockResolvedValue(innlogget());
    mocks.slettMappe.mockRejectedValue(new mocks.BackendFeilException(500, "Intern feil"));

    await expect(send({ handling: "slett", sti: "Bank" })).rejects.toThrow("Intern feil");
  });
});
