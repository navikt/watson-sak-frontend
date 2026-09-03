import { RouterContextProvider, type LoaderFunctionArgs } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({ brukerMockdata: false }));
const hentFilerMock = vi.hoisted(() => vi.fn());
const hentSakstilgangFraMock = vi.hoisted(() => vi.fn());
const hentFilerForSak = vi.hoisted(() => vi.fn());

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.brukerMockdata;
  },
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("obo-token"),
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn(),
}));

vi.mock("~/saker/api.server", async (importOriginal) => {
  const original = await importOriginal<typeof import("~/saker/api.server")>();
  return { ...original, hentFiler: hentFilerMock };
});

vi.mock("~/saker/tilgang.server", () => ({
  hentSakstilgangFraMock,
}));

vi.mock("./mock-data-filer.server", () => ({
  hentFilerForSak,
  leggTilFil: vi.fn(),
}));

function lagLoaderArgs(sakId = "sak-1"): LoaderFunctionArgs {
  return {
    request: new Request(`http://localhost/api/saker/${sakId}/filer`),
    params: { sakId },
    context: new RouterContextProvider(),
    pattern: "/api/saker/:sakId/filer",
    url: new URL(`http://localhost/api/saker/${sakId}/filer`),
  };
}

describe("filer.api loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.brukerMockdata = false;
  });

  it("bevarer backendens HTTP-status ved feil", async () => {
    const { BackendFeilException } = await import("~/saker/api.server");
    hentFilerMock.mockRejectedValue(new BackendFeilException(403, "Ingen tilgang til denne saken"));
    const { loader } = await import("./filer.api");

    await expect(loader(lagLoaderArgs())).rejects.toMatchObject({
      data: "Ingen tilgang til denne saken",
      init: { status: 403 },
    });
  });

  it("skjuler tekniske backend-feil", async () => {
    const { BackendFeilException } = await import("~/saker/api.server");
    hentFilerMock.mockRejectedValue(new BackendFeilException(500, "Database timeout ved sak 42"));
    const { loader } = await import("./filer.api");

    await expect(loader(lagLoaderArgs())).rejects.toMatchObject({
      data: "Kunne ikke hente filer.",
      init: { status: 500 },
    });
  });

  it("avviser mock-bruker uten lesetilgang", async () => {
    testState.brukerMockdata = true;
    hentSakstilgangFraMock.mockResolvedValue({
      sak: { id: 42 },
      kanSe: false,
      kanRedigereDokumenter: false,
    });
    const { loader } = await import("./filer.api");

    await expect(loader(lagLoaderArgs())).rejects.toMatchObject({
      data: "Ingen tilgang til denne saken",
      init: { status: 403 },
    });
    expect(hentFilerForSak).not.toHaveBeenCalled();
  });
});
