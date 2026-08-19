/**
 * Tester for SakDetaljSide loader — backend-sti (skalBrukeMockdata: false).
 *
 * Dekker spesifikt regresjonen der `hentFiler` sitt HTTP 403-svar (bruker mangler
 * fil-tilgang, se `FilTilgangService` i watson-admin-api) forkastet hele
 * `Promise.all` i loaderen og krasjet hele sakssiden i stedet for å skjule
 * filområdet. Se `hentFilerMedTilgangskontroll` i `SakDetaljSide.server.ts`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

const mockHentKontrollsak = vi.fn();
const mockHentHendelser = vi.fn();
const mockHentJournalposter = vi.fn();
const mockHentSaksbehandlere = vi.fn();
const mockHentFiler = vi.fn();
const mockSøkKontrollsaker = vi.fn();

class MockBackendFeilException extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BackendFeilException";
  }
}

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: false,
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("~/saker/api.server", () => ({
  BackendFeilException: MockBackendFeilException,
  hentKontrollsak: mockHentKontrollsak,
  hentHendelser: mockHentHendelser,
  hentJournalposter: mockHentJournalposter,
  hentSaksbehandlere: mockHentSaksbehandlere,
  hentFiler: mockHentFiler,
  søkKontrollsaker: mockSøkKontrollsaker,
}));

function lagLoaderArgs(sakId = "1") {
  return {
    request: new Request("http://localhost/saker/" + sakId),
    params: { sakId },
    context: {},
  } as unknown as Parameters<typeof import("./SakDetaljSide.server").loader>[0];
}

const grunnleggendeSak = {
  id: 1,
  personIdent: null,
  dokumenter: [],
};

describe("SakDetaljSide loader — backend-sti", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skjuler filområdet stille når hentFiler gir 403 (mangler fil-tilgang)", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockRejectedValue(new MockBackendFeilException(403, "Ingen tilgang til sak 1"));

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.harFilTilgang).toBe(false);
    expect(resultat.filer).toEqual([]);
    // Resten av siden skal fortsatt lastes — ikke kaste hele loaderen.
    expect(resultat.sak).toEqual(grunnleggendeSak);
  });

  it("setter harFilTilgang: true og returnerer filene når hentFiler lykkes", async () => {
    const filer = [{ id: "f1", filnavn: "vedlegg.pdf" }];
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockResolvedValue(filer);

    const { loader } = await import("./SakDetaljSide.server");
    const resultat = await loader(lagLoaderArgs());

    expect(resultat.harFilTilgang).toBe(true);
    expect(resultat.filer).toEqual(filer);
  });

  it("lar andre feil enn 403 fra hentFiler boble opp (kaster fortsatt loaderen)", async () => {
    mockHentKontrollsak.mockResolvedValue(grunnleggendeSak);
    mockHentHendelser.mockResolvedValue([]);
    mockHentJournalposter.mockResolvedValue([]);
    mockHentSaksbehandlere.mockResolvedValue([]);
    mockHentFiler.mockRejectedValue(new MockBackendFeilException(500, "Intern feil"));

    const { loader } = await import("./SakDetaljSide.server");

    await expect(loader(lagLoaderArgs())).rejects.toThrow("Intern feil");
  });
});
