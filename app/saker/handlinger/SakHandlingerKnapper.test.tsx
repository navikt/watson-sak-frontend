import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SakHandlingerKnapper } from "./SakHandlingerKnapper";

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    organisasjoner: [],
  }),
}));

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakUuid("101", 9),
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "UTREDES",
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    avslutningskonklusjon: null,
    tilgjengeligeHandlinger: [
      {
        handling: "SETT_VENTER_PA_INFORMASJON",
        pakrevdeFelter: [],
        resultatStatus: "VENTER_PA_INFORMASJON",
      },
      { handling: "SETT_VENTER_PA_VEDTAK", pakrevdeFelter: [], resultatStatus: "VENTER_PA_VEDTAK" },
      {
        handling: "SETT_ANMELDELSE_VURDERES",
        pakrevdeFelter: [],
        resultatStatus: "ANMELDELSE_VURDERES",
      },
      { handling: "SETT_HENLAGT", pakrevdeFelter: [], resultatStatus: "HENLAGT" },
      { handling: "SETT_I_BERO", pakrevdeFelter: [], resultatStatus: "I_BERO" },
      { handling: "FRISTILL", pakrevdeFelter: [], resultatStatus: "UFORDELT" },
    ],
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000090101",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
    ],
    merking: null,
    resultat: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    ...overrides,
  };
}

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("SakHandlingerKnapper", () => {
  it("viser tildel-handlinger for sak med status UFORDELT", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({
          status: "UFORDELT",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
          tilgjengeligeHandlinger: [
            {
              handling: "TILDEL",
              pakrevdeFelter: [{ felt: "navIdent", tillatteVerdier: [] }],
              resultatStatus: "TILDELT",
            },
            { handling: "SETT_I_BERO", pakrevdeFelter: [], resultatStatus: "I_BERO" },
          ],
        })}
        saksbehandlere={["Kari Nordmann"]}
        saksbehandlerDetaljer={[]}
        seksjoner={["4812", "4813"]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Tildel saksbehandler" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Tildel meg" })).toBeDefined();
    const sendTilAnnenEnhet = screen.getByRole("button", { name: "Send til annen enhet" });
    expect(sendTilAnnenEnhet).toBeDefined();
    expect((sendTilAnnenEnhet as HTMLButtonElement).disabled).toBe(true);
  });

  it("viser utredes-handlinger for sak med status UTREDES", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({ status: "UTREDES" })}
        saksbehandlere={["Kari Nordmann"]}
        saksbehandlerDetaljer={[]}
        seksjoner={["4812", "4813"]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Del tilgang" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Stans ytelse" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sett i bero" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Vurder anmeldelse" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Legg tilbake i ufordelt" })).toBeDefined();

    expect(screen.queryByRole("button", { name: "Tildel saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tildel meg" })).toBeNull();
  });

  it("viser ingen handlinger for inaktiv kontrollsak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({ status: "AVSLUTTET", tilgjengeligeHandlinger: [] })}
        saksbehandlere={["Kari Nordmann"]}
        saksbehandlerDetaljer={[]}
        seksjoner={["4812", "4813"]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Tildel saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tildel meg" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send til annen enhet" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ferdigstill sak" })).toBeNull();
  });

  it("viser avslutt sak for henlagt sak med tilgjengelig avslutt-handling", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({
          status: "HENLAGT",
          tilgjengeligeHandlinger: [
            { handling: "AVSLUTT", pakrevdeFelter: [], resultatStatus: "AVSLUTTET" },
          ],
        })}
        saksbehandlere={["Kari Nordmann"]}
        saksbehandlerDetaljer={[]}
        seksjoner={["4812", "4813"]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Avslutt sak" })).toBeDefined();
  });

  it("ignorerer ukjente handlinger trygt", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({
          status: "UTREDES",
          tilgjengeligeHandlinger: [
            { handling: "UKJENT_HANDLING" as never, pakrevdeFelter: [], resultatStatus: "UTREDES" },
          ],
        })}
        saksbehandlere={["Kari Nordmann"]}
        saksbehandlerDetaljer={[]}
        seksjoner={["4812", "4813"]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });
});
