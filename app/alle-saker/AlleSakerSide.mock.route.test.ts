import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import type { KontrollsakResponse } from "~/saker/types.backend";

const { hentAlleSakerMock, hentInnloggetBrukerMock } = vi.hoisted(() => ({
  hentAlleSakerMock: vi.fn(),
  hentInnloggetBrukerMock: vi.fn(),
}));

vi.mock("~/config/env.server", () => ({
  env: { ENVIRONMENT: "local-mock" },
  skalBrukeMockdata: true,
}));
vi.mock("~/saker/mock-alle-saker.server", () => ({ hentAlleSaker: hentAlleSakerMock }));
vi.mock("~/auth/innlogget-bruker.server", () => ({ hentInnloggetBruker: hentInnloggetBrukerMock }));
vi.mock("~/saker/saksliste/adaptere", () => ({
  mapKontrollsakTilSakslisteRad: (sak: KontrollsakResponse) => ({ id: sak.id }),
}));

function sak(id: string, opprettet: string, steg = "UTREDNING", eier = "Z999999") {
  return {
    id,
    opprettet,
    steg,
    blokkert: null,
    enhet: "ky153k",
    kategori: "ARBEID",
    misbruktype: [],
    merking: [],
    saksbehandlere: { eier: { navIdent: eier, navn: "Test", enhetId: "ky153k" }, deltMed: [] },
  } as unknown as KontrollsakResponse;
}

// 2. okt. 2026 i Oslo
const NÅ = new Date("2026-10-02T10:00:00Z");

const SAKER = [
  sak("dag30", "2026-09-02T21:59:59Z"),
  sak("dag29", "2026-09-02T22:00:00Z"),
  sak("mnd12", "2025-10-02T21:59:59Z"),
  sak("mnd11a", "2025-10-02T22:00:00Z", "POLITI"),
  sak("mnd11b", "2025-11-02T22:59:59Z", "OPPRETTET", "Z111111"),
  sak("mnd10", "2025-11-02T23:00:00Z"),
  sak("avsluttet", "2025-10-10T10:00:00Z", "AVSLUTTET"),
];

async function kjørLoader(params: Record<string, string | string[]>) {
  const søk = new URLSearchParams();
  for (const [nøkkel, verdi] of Object.entries(params)) {
    for (const v of [verdi].flat()) søk.append(nøkkel, v);
  }
  const { loader } = await import("./AlleSakerSide.route");
  const url = `http://localhost/alle-saker?${søk}`;
  return loader({
    request: new Request(url),
    url: new URL(url),
    pattern: "/alle-saker",
    params: {},
    context: new RouterContextProvider(),
  });
}

describe("AlleSakerSide loader — mock-sti med aldersfilter", { timeout: 15000 }, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NÅ);
    hentAlleSakerMock.mockReturnValue(SAKER);
    hentInnloggetBrukerMock.mockResolvedValue({ navIdent: "Z999999" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("fra 30 dager tar med dag 30, ikke dag 29, og aldri avsluttede", async () => {
    const resultat = await kjørLoader({ aldersvarsel: "FRA_30_DAGER", sorter: "saksid" });
    expect(resultat.totalAntall).toBe(5);
    expect(resultat.rader.map((r) => r.id).sort()).toEqual(
      ["dag30", "mnd10", "mnd11a", "mnd11b", "mnd12"].sort(),
    );
  });

  it("nærmer seg 12 måneder gir bare saker med 11 hele måneder", async () => {
    const resultat = await kjørLoader({ aldersvarsel: "NAERMER_SEG_12_MAANEDER" });
    expect(resultat.rader.map((r) => r.id).sort()).toEqual(["mnd11a", "mnd11b"]);
  });

  it("utelater avsluttede også når steg ber om AVSLUTTET", async () => {
    const resultat = await kjørLoader({
      aldersvarsel: "NAERMER_SEG_12_MAANEDER",
      steg: ["AVSLUTTET", "POLITI"],
    });
    expect(resultat.rader.map((r) => r.id)).toEqual(["mnd11a"]);
  });

  it("ansvarlig=MEG bruker innlogget ident fra serveren", async () => {
    const resultat = await kjørLoader({
      aldersvarsel: "NAERMER_SEG_12_MAANEDER",
      ansvarlig: "MEG",
    });
    expect(resultat.rader.map((r) => r.id)).toEqual(["mnd11a"]);
    expect(hentInnloggetBrukerMock).toHaveBeenCalledTimes(1);
  });

  it("filtrerer før paginering slik at treffantallet stemmer", async () => {
    const mangeSaker = Array.from({ length: 60 }, (_, i) =>
      sak(`gammel${i}`, "2026-01-15T10:00:00Z", i % 2 === 0 ? "UTREDNING" : "AVSLUTTET"),
    );
    hentAlleSakerMock.mockReturnValue([...mangeSaker, ...SAKER]);

    const side2 = await kjørLoader({ aldersvarsel: "FRA_30_DAGER", side: "2" });
    expect(side2.totalAntall).toBe(35);
    expect(side2.aktivSide).toBe(2);
  });
});
