import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Nøkkeltallkort } from "./Nøkkeltallkort";

vi.mock("~/saker/saksliste/adaptere", () => ({
  mapKontrollsakTilSakslisteRad: (sak: { id: number }) => ({
    id: sak.id,
    saksreferanse: String(sak.id),
    detaljHref: `/saker/${sak.id}`,
    navn: null,
    kategori: null,
    misbrukstyper: [],
    steg: null,
    status: "Aktiv",
    opprettet: sak.id === 1 ? "2026-01-02T00:00:00Z" : "2026-01-01T00:00:00Z",
    oppdatert: sak.id === 1 ? null : "2026-01-03T00:00:00Z",
    saksbehandler: null,
  }),
}));

import { SistAktiveSakerOversikt } from "~/landingsside/komponenter/SistAktiveSakerOversikt";
import type { KontrollsakResponse } from "~/saker/types.backend";

describe("Nøkkeltallkort", () => {
  it("formaterer numeriske verdier med norsk tusenskille og lar strenger være uendret", () => {
    const { rerender } = render(
      <Nøkkeltallkort verdi={3117} etikett="Saker" forklaring="Totalt" farge="info" />,
    );

    expect(
      screen.getByText((_, element) => element?.textContent === "3\u00a0117"),
    ).toBeDefined();

    rerender(
      <Nøkkeltallkort verdi="3 117 saker" etikett="Saker" forklaring="Totalt" farge="info" />,
    );

    expect(screen.getByText("3 117 saker")).toBeDefined();
  });
});

describe("SistAktiveSakerOversikt", () => {
  it("viser sakene etter oppdatert-dato synkende og bruker opprettet-dato som reserve", () => {
    const saker = [{ id: 1 }, { id: 2 }] as KontrollsakResponse[];
    const router = createMemoryRouter(
      [
        { path: "/", element: <SistAktiveSakerOversikt saker={saker} /> },
        { path: "/saker/:sakId", element: <p>Saksdetaljer</p> },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    const rader = screen.getAllByRole("row");
    expect(rader[1].textContent).toContain("#2");
    expect(rader[2].textContent).toContain("#1");
    expect(saker.map((sak) => sak.id)).toEqual([1, 2]);
  });
});
