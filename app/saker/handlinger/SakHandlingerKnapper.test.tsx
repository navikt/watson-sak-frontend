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
    saksbehandler: "Z123456",
    saksbehandlere: { deltMed: [] },
    status: "UTREDES",
    kategori: "ARBEID",
    prioritet: "NORMAL",
    mottakEnhet: "4812",
    mottakSaksbehandler: "Z654321",
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000090101",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
      },
    ],
    bakgrunn: null,
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
  it("viser tildel-handlinger for sak med status OPPRETTET", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({ status: "OPPRETTET" })}
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

    expect(screen.getByRole("button", { name: "Ferdigstill sak" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Del tilgang" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Stans ytelse" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sett i bero" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett anmeldelse" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Legg tilbake i ufordelt" })).toBeDefined();

    expect(screen.queryByRole("button", { name: "Tildel saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tildel meg" })).toBeNull();
  });

  it("viser ingen handlinger for inaktiv kontrollsak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({ status: "AVSLUTTET" })}
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
});
