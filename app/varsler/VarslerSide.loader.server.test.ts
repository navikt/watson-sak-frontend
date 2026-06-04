import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: true,
}));

const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const hentAlleVarslerMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ varsler: [], harFlere: false, totalItems: 0 }),
);
const hentVarslerFraMockMock = vi.hoisted(() => vi.fn().mockReturnValue([]));

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("~/varsler/api.server", () => ({
  hentAlleVarsler: hentAlleVarslerMock,
}));

vi.mock("~/varsler/mock-data.server", () => ({
  hentVarsler: hentVarslerFraMockMock,
}));

async function runLoader(url: string) {
  const { loader } = await import("./VarslerSide.loader.server");
  const request = new Request(url);
  return loader({ request, params: {}, context: {} });
}

describe("VarslerSide loader", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("mock-modus", () => {
    it("returnerer page=1 og varsler fra mock", async () => {
      hentVarslerFraMockMock.mockReturnValue([
        { id: "v1", sakId: "101", tittel: "T", tekst: "T", tidspunkt: "2026-01-01", erLest: false },
      ]);

      const resultat = await runLoader("http://localhost/varsler");

      expect(resultat.page).toBe(1);
      expect(resultat.varsler).toHaveLength(1);
    });

    it("faller tilbake til side 1 ved ugyldig page-parameter (NaN-sikring)", async () => {
      const resultat = await runLoader("http://localhost/varsler?page=abc");
      expect(resultat.page).toBe(1);
    });

    it("faller tilbake til side 1 ved negativt sidenummer", async () => {
      const resultat = await runLoader("http://localhost/varsler?page=-3");
      expect(resultat.page).toBe(1);
    });

    it("paginerer korrekt — returnerer harFlere=true når det finnes mer data", async () => {
      const mange = Array.from({ length: 25 }, (_, i) => ({
        id: `v${i}`,
        sakId: "1",
        tittel: "T",
        tekst: "T",
        tidspunkt: "2026-01-01",
        erLest: false,
      }));
      hentVarslerFraMockMock.mockReturnValue(mange);

      const resultat = await runLoader("http://localhost/varsler?page=1");

      expect(resultat.harFlere).toBe(true);
    });
  });

  describe("backend-modus", () => {
    it("kaller hentAlleVarsler med riktig token og side", async () => {
      testState.skalBrukeMockdata = false;

      await runLoader("http://localhost/varsler?page=3");

      expect(hentAlleVarslerMock).toHaveBeenCalledWith("token-123", 3, expect.any(Number));
    });

    it("returnerer resultat fra backend med korrekt page", async () => {
      testState.skalBrukeMockdata = false;
      hentAlleVarslerMock.mockResolvedValue({ varsler: [], harFlere: true, totalItems: 42 });

      const resultat = await runLoader("http://localhost/varsler?page=2");

      expect(resultat.page).toBe(2);
      expect(resultat.harFlere).toBe(true);
      expect(resultat.totalItems).toBe(42);
    });
  });
});
