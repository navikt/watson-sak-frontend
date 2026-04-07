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
    saksbehandler: "Z123456",
    status: "OPPRETTET",
    kategori: "FEILUTBETALING",
    prioritet: "NORMAL",
    mottakEnhet: "4812",
    mottakSaksbehandler: "Z654321",
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000090101",
        type: "Dagpenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
      },
    ],
    bakgrunn: {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      kilde: "ANONYM_TIPS",
      innhold: "Kontrollsak fra backend-shaped mockdatasett.",
      avsender: null,
      vedlegg: [],
      tilleggsopplysninger: null,
    },
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
    expect(screen.getByText("Anonymt tips")).toBeDefined();
    expect(screen.getByText("Fnr: 10987654321")).toBeDefined();
    expect(screen.getByText("Feilutbetaling")).toBeDefined();
  });
});
