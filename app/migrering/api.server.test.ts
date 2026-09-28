import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: vi.fn(),
  kastHvisUtlogget: vi.fn(),
  loggFeil: vi.fn(),
}));
vi.mock("~/auth/access-token", () => ({ getBackendOboToken: mocks.token }));
vi.mock("~/auth/session-utløpt.server", () => ({ kastHvisUtlogget: mocks.kastHvisUtlogget }));
vi.mock("~/config/env.server", () => ({ BACKEND_API_URL: "http://localhost:8080" }));
vi.mock("~/logging/logging", () => ({ logger: { error: mocks.loggFeil } }));

import { hentMigreringskandidater } from "./api.server";

const request = new Request("http://localhost/migrering?navIdent=ANNEN_BRUKER");
const kandidat = {
  kandidatId: "UTREDNING:200001",
  kilde: "UTREDNING",
  legacyPid: "200001",
  kategori: "TIPS_RESTANSE",
  ansvar: { type: "BEKREFTET", navIdent: "L999999" },
  enhet: null,
  vurdering: "MULIG_KANDIDAT",
  ekskluderFraStatistikk: false,
  referansedato: "2025-03-01",
  referansedatoFelt: "TIPSINNDATO",
  fase: "Utredning uten resultat",
  begrunnelse: "Syntetisk testkandidat",
  grunnlag: [],
  alleredeMigrertTilKontrollsakId: null,
  hentetTidspunkt: "2025-01-01T00:00:00Z",
  personIdent: "11111111111",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.token.mockResolvedValue("lokal-testtoken");
});
afterEach(() => vi.unstubAllGlobals());

describe("hentMigreringskandidater fra lokal backend", () => {
  it("bruker OBO-token og henter allerede autorisert respons uten klientstyrt NAV-ident", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ items: [kandidat], totalItems: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultat = await hentMigreringskandidater(request);

    expect(mocks.token).toHaveBeenCalledWith(request);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/migrering/kandidater?page=1&size=100",
      { headers: { Authorization: "Bearer lokal-testtoken", Accept: "application/json" } },
    );
    expect(resultat).toMatchObject([
      { kandidatId: "UTREDNING:200001", legacyPid: "200001", personIdent: "11111111111" },
    ]);
  });

  it("avviser feil og logger bare HTTP-status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 502 })));

    await expect(hentMigreringskandidater(request)).rejects.toMatchObject({ status: 502 });
    expect(mocks.loggFeil).toHaveBeenCalledWith(expect.any(String), { status: 502 });
  });

  it("stopper ved ugyldig backend-kontrakt uten å logge payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ items: [{ kandidatId: "x" }], totalItems: 1 })),
    );

    await expect(hentMigreringskandidater(request)).rejects.toThrow("Ugyldig svar");
    expect(mocks.loggFeil).toHaveBeenCalledWith("Ugyldig kontrakt fra migrerings-API");
  });

  it("viser ikke en avkortet liste som om den var fullstendig", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ items: [kandidat], totalItems: 101 })),
    );

    await expect(hentMigreringskandidater(request)).rejects.toThrow("ikke fullstendig");
  });
});
