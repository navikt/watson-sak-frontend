import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SøkResultatKort } from "./SøkResultatKort";

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
    status: "UFORDELT",
    kategori: "ARBEID",
    kilde: "PUBLIKUM",
    misbruktype: [],
    prioritet: "NORMAL",
    avslutningskonklusjon: null,
    tilgjengeligeHandlinger: [],
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000090101",
        type: "Dagpenger",
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

describe("SøkResultatKort", () => {
  it("renderer backend-shapet kontrollsak med opprettet dato, kilde og personIdent", () => {
    renderMedRouter(<SøkResultatKort sak={lagKontrollsak()} />);

    expect(screen.getByRole("heading", { name: "Sak 101" })).toBeDefined();
    expect(screen.getByText("3. feb. 2026")).toBeDefined();
    expect(screen.getByText("Publikum")).toBeDefined();
    expect(screen.getByText("Fnr: 10987654321")).toBeDefined();
    expect(screen.getByText("Arbeid")).toBeDefined();
  });
});
