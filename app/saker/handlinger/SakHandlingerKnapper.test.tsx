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
    status: "UTREDES",
    kategori: "FEILUTBETALING",
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
  it("viser tildel saksbehandler, tildel meg og send til annen enhet for aktiv kontrollsak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak()}
        saksbehandlere={["Kari Nordmann"]}
        seksjoner={["4812", "4813"]}
      />,
    );

    expect(screen.getByRole("button", { name: "Tildel saksbehandler" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Tildel meg" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Send til annen enhet" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Videresend til seksjon" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Flytt til/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Henlegg" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Videresend til NAY/NFP" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Politianmeldelse" })).toBeNull();
  });

  it("viser ingen handlinger for inaktiv kontrollsak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({ status: "AVSLUTTET" })}
        saksbehandlere={["Kari Nordmann"]}
        seksjoner={["4812", "4813"]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Tildel saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tildel meg" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send til annen enhet" })).toBeNull();
  });
});
