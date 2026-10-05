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

import {
  ferdigstillMigreringskandidat,
  hentMigreringskandidat,
  hentMigreringsliste,
  hentMigreringskandidater,
} from "./api.server";

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

describe("manuell migreringsstatus", () => {
  it("henter lagret status med brukerens token", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(Response.json({ ...kandidat, migreringsstatus: "UNDER_MIGRERING" })),
    );

    const resultat = await hentMigreringskandidat(request, "UTREDNING:200001");

    expect(resultat.migreringsstatus).toBe("UNDER_MIGRERING");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/migrering/kandidater/UTREDNING%3A200001",
      { headers: { Authorization: "Bearer lokal-testtoken", Accept: "application/json" } },
    );
  });

  it("lagrer kun ferdigmelding etter eksplisitt POST", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await ferdigstillMigreringskandidat(request, "UTREDNING:200001");

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/migrering/kandidater/UTREDNING%3A200001/ferdigstill",
      { method: "POST", headers: { Authorization: "Bearer lokal-testtoken" } },
    );
  });

  it("returnerer backend-avslag uten å logge personopplysninger", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(ferdigstillMigreringskandidat(request, "SV:200001")).rejects.toMatchObject({
      status: 404,
    });
    expect(mocks.loggFeil).toHaveBeenCalledWith("Kunne ikke ferdigmerke migreringskandidat", {
      status: 404,
    });
  });
});

describe("hentMigreringskandidater fra lokal backend", () => {
  it("bruker OBO-token og henter allerede autorisert respons uten klientstyrt NAV-ident", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ items: [kandidat], totalItems: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultat = await hentMigreringskandidater(request);

    expect(mocks.token).toHaveBeenCalledWith(request);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/migrering/kandidater?visning=MINE&page=1&size=20",
      { headers: { Authorization: "Bearer lokal-testtoken", Accept: "application/json" } },
    );
    expect(resultat).toMatchObject([
      { kandidatId: "UTREDNING:200001", legacyPid: "200001", personIdent: "11111111111" },
    ]);
  });

  it("henter ansattlisten med visning=ANSATTE og leser utilgjengelig-flagget", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        items: [{ ...kandidat, personIdent: null }],
        totalItems: 1,
        utilgjengelig: true,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultat = await hentMigreringsliste(request, "ANSATTE");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/migrering/kandidater?visning=ANSATTE&page=1&size=20",
      expect.anything(),
    );
    expect(resultat.utilgjengelig).toBe(true);
    expect(resultat.kandidater[0]?.personIdent).toBeNull();
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

  it("henter bare den siden som er bedt om, og regner ut antall sider", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ items: [kandidat], totalItems: 45 }));
    vi.stubGlobal("fetch", fetchMock);

    const resultat = await hentMigreringsliste(request, "MINE", 3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/migrering/kandidater?visning=MINE&page=3&size=20",
      expect.anything(),
    );
    expect(resultat).toMatchObject({ side: 3, totalSider: 3, totalAntall: 45 });
    expect(resultat.kandidater).toHaveLength(1);
  });

  it("gir null sider når listen er tom", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [], totalItems: 0 })));

    expect(await hentMigreringsliste(request, "MINE")).toMatchObject({
      totalSider: 0,
      totalAntall: 0,
    });
  });
});
