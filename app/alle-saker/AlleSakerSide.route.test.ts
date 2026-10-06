import { afterEach, describe, expect, it, vi } from "vitest";
import { RouterContextProvider } from "react-router";
import { ALLE_STEG } from "~/saker/steg";

const { hentKontrollsakerMock } = vi.hoisted(() => ({
  hentKontrollsakerMock: vi.fn(),
}));

vi.mock("~/config/env.server", () => ({ skalBrukeMockdata: false }));
vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));
vi.mock("~/fordeling/api.server", () => ({
  hentKontrollsaker: hentKontrollsakerMock,
}));
vi.mock("~/saker/api.server", () => ({
  hentSaksbehandlere: vi.fn().mockResolvedValue([]),
}));

describe("AlleSakerSide loader", () => {
  afterEach(() => vi.clearAllMocks());

  it.each([
    {
      navn: "åpne saker",
      steg: ALLE_STEG,
      status: [],
      forventet: { steg: ALLE_STEG, status: undefined, statusSteg: undefined },
    },
    {
      navn: "aktive saker",
      steg: ["UTREDNING", "STRAFFERETTSLIG_VURDERING"],
      status: ["AKTIV"],
      forventet: {
        steg: ["UTREDNING", "STRAFFERETTSLIG_VURDERING"],
        status: ["AKTIV"],
        statusSteg: undefined,
      },
    },
    {
      navn: "ventende saker",
      steg: ALLE_STEG,
      status: ["VENTER_PA_INFORMASJON", "I_BERO", "HOS_FORVALTNING", "HOS_POLITI"],
      forventet: {
        steg: ALLE_STEG,
        status: ["VENTER_PA_INFORMASJON", "I_BERO"],
        statusSteg: ["FORVALTNING", "POLITI"],
      },
    },
    {
      navn: "hos politiet alene",
      steg: [],
      status: ["HOS_POLITI"],
      forventet: { steg: undefined, status: undefined, statusSteg: ["POLITI"] },
    },
    {
      navn: "uten filtre",
      steg: [],
      status: [],
      forventet: { steg: undefined, status: undefined, statusSteg: undefined },
    },
  ])(
    "sender vanlige filtre for $navn til backend",
    async ({ steg, status, forventet }) => {
      hentKontrollsakerMock.mockResolvedValue({
        items: [],
        page: 1,
        totalPages: 0,
        totalItems: 0,
      });
      const { loader } = await import("./AlleSakerSide.route");
      const params = new URLSearchParams({ enhet: "ky153k", saksbehandler: "Z123456" });
      steg.forEach((verdi) => params.append("steg", verdi));
      status.forEach((verdi) => params.append("status", verdi));
      await loader({
        request: new Request(`http://localhost/alle-saker?${params}`),
        url: new URL(`http://localhost/alle-saker?${params}`),
        pattern: "/alle-saker",
        params: {},
        context: new RouterContextProvider(),
      });
      expect(hentKontrollsakerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ...forventet,
          enhet: ["ky153k"],
          ansvarligNavIdent: "Z123456",
        }),
      );
      expect(hentKontrollsakerMock.mock.calls[0][0]).not.toHaveProperty("arbeidsfilter");
    },
    15000,
  );
});
