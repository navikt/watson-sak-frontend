import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { MineSakerInnhold } from "./MineSakerInnhold";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakUuid("201", 2),
    personIdent: "10987654321",
    saksbehandler: "Z123456",
    status: "OPPRETTET",
    kategori: "FEILUTBETALING",
    prioritet: "NORMAL",
    mottakEnhet: "4812",
    mottakSaksbehandler: "Z654321",
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000020101",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
      },
    ],
    bakgrunn: {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      kilde: "ANONYM_TIPS",
      innhold: "Tips om mulig feilutbetaling.",
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

describe("MineSakerInnhold", () => {
  it("renderer backend-shapet mine sak med tittel, status og detaljlenke", () => {
    renderMedRouter(<MineSakerInnhold saker={[lagKontrollsak()]} detaljSti="/saker" />);

    const lenke = screen.getByRole("link", { name: /Feilutbetaling - Sykepenger/i });

    expect(lenke.getAttribute("href")).toBe(`/saker/${getSaksreferanse(lagMockSakUuid("201", 2))}`);
    expect(screen.getByText("Opprettet")).toBeDefined();
    expect(screen.getByText("Opprettet 03.02.2026")).toBeDefined();
  });
});
