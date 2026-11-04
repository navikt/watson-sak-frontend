import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Varsel } from "./typer";

const testState = vi.hoisted(() => ({ skalBrukeMockdata: true }));
const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const hentVarselsideMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ varsler: [], totalItems: 0, totalSider: 1 }),
);
const hentVarslerFraMockMock = vi.hoisted(() => vi.fn().mockReturnValue([]));

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));
vi.mock("~/auth/access-token", () => ({ getBackendOboToken: getBackendOboTokenMock }));
vi.mock("~/varsler/api.server", () => ({ hentVarselside: hentVarselsideMock }));
vi.mock("~/varsler/mock-data.server", () => ({ hentVarsler: hentVarslerFraMockMock }));

async function runLoader(url: string) {
  const { loader } = await import("./VarslerSide.loader.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return loader({ request: new Request(url), params: {}, context: {} } as any);
}

function lagVarsler(antall: number, erLest: boolean, prefiks: string): Varsel[] {
  return Array.from({ length: antall }, (_, i) => ({
    id: `${prefiks}${i}`,
    sakId: "1",
    tittel: "T",
    tekst: "T",
    tidspunkt: "2026-01-01",
    erLest,
  }));
}

describe("VarslerSide loader", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("mock-modus", () => {
    it("deler varslene i uleste og leste med maks 10 per side", async () => {
      hentVarslerFraMockMock.mockReturnValue([
        ...lagVarsler(12, false, "u"),
        ...lagVarsler(25, true, "l"),
      ]);

      const resultat = await runLoader("http://localhost/varsler");

      expect(resultat.uleste.varsler).toHaveLength(10);
      expect(resultat.uleste.totalItems).toBe(12);
      expect(resultat.uleste.harFlere).toBe(true);
      expect(resultat.leste.varsler).toHaveLength(10);
      expect(resultat.leste.totalItems).toBe(25);
      expect(resultat.leste.totalSider).toBe(3);
      expect(resultat.leste.side).toBe(1);
    });

    it("bruker side for leste og ulesteSide for uleste hver for seg", async () => {
      hentVarslerFraMockMock.mockReturnValue([
        ...lagVarsler(12, false, "u"),
        ...lagVarsler(25, true, "l"),
      ]);

      const resultat = await runLoader("http://localhost/varsler?side=3&ulesteSide=2");

      expect(resultat.leste.side).toBe(3);
      expect(resultat.leste.varsler.map((v) => v.id)).toEqual(["l20", "l21", "l22", "l23", "l24"]);
      expect(resultat.uleste.varsler.map((v) => v.id)).toEqual(["u10", "u11"]);
      expect(resultat.uleste.harFlere).toBe(false);
    });

    it.each(["abc", "-3", "0"])("faller tilbake til side 1 ved ugyldig side=%s", async (side) => {
      const resultat = await runLoader(`http://localhost/varsler?side=${side}&ulesteSide=${side}`);

      expect(resultat.leste.side).toBe(1);
      expect(resultat.uleste.side).toBe(1);
    });
  });

  it("viser siste side av leste når side er for høy", async () => {
    hentVarslerFraMockMock.mockReturnValue(lagVarsler(5, true, "l"));

    const resultat = await runLoader("http://localhost/varsler?side=2");

    expect(resultat.leste.side).toBe(1);
    expect(resultat.leste.varsler).toHaveLength(5);
  });

  describe("backend-modus", () => {
    it("henter uleste og leste med riktig filter, side og sidestørrelse", async () => {
      testState.skalBrukeMockdata = false;

      await runLoader("http://localhost/varsler?side=4&ulesteSide=2");

      expect(hentVarselsideMock).toHaveBeenCalledWith("token-123", "uleste", 2, 10);
      expect(hentVarselsideMock).toHaveBeenCalledWith("token-123", "leste", 4, 10);
    });

    it("returnerer totaler og om det finnes flere uleste", async () => {
      testState.skalBrukeMockdata = false;
      hentVarselsideMock.mockImplementation(async (_token: string, filter: string) =>
        filter === "uleste"
          ? { varsler: [], totalItems: 15, totalSider: 2 }
          : { varsler: [], totalItems: 42, totalSider: 5 },
      );

      const resultat = await runLoader("http://localhost/varsler");

      expect(resultat.uleste.totalItems).toBe(15);
      expect(resultat.uleste.harFlere).toBe(true);
      expect(resultat.leste.totalItems).toBe(42);
      expect(resultat.leste.totalSider).toBe(5);
    });

    it("henter siste side av leste på nytt når side er for høy", async () => {
      testState.skalBrukeMockdata = false;
      hentVarselsideMock.mockImplementation(
        async (_token: string, filter: string, page: number) => ({
          varsler: filter === "leste" && page === 2 ? [{ id: "l1" }] : [],
          totalItems: filter === "leste" ? 15 : 0,
          totalSider: filter === "leste" ? 2 : 1,
        }),
      );

      const resultat = await runLoader("http://localhost/varsler?side=9");

      expect(hentVarselsideMock).toHaveBeenCalledWith("token-123", "leste", 2, 10);
      expect(resultat.leste.side).toBe(2);
      expect(resultat.leste.varsler).toHaveLength(1);
    });
  });
});
