import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { SakDetaljSidePanel } from "./SakDetaljSidePanel";
import type { Seksjonsfeil } from "~/saker/SakDetaljSide.loader.server";
import { kontrollsakResponseSchema } from "~/saker/types.backend";

vi.mock("./SaksbehandlereKort", () => ({ SaksbehandlereKort: () => null }));
vi.mock("~/saker/historikk/SakHistorikk", () => ({
  SakHistorikk: () => <h2>Historikk</h2>,
}));

const basisSak = {
  id: 1,
  kontrollobjekt: { personIdent: "12345678901", navn: "Ola Nordmann" },
  saksbehandlere: {
    ansvarlig: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
    deltMed: [],
    opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
  },
  steg: "UTREDES",
  status: null,
  kategori: "ARBEID",
  kilde: "NAV_KONTROLL",
  misbruktype: [],
  prioritet: "NORMAL",
  ytelser: [],
  opprettet: "2026-01-01T00:00:00Z",
  oppdatert: null,
} as const;

function renderPanel(visLiggetidVarsel?: boolean, seksjonsfeil: Seksjonsfeil = {}) {
  const sak = kontrollsakResponseSchema.parse({
    ...basisSak,
    ...(visLiggetidVarsel !== undefined && { visLiggetidVarsel }),
  });

  const panel = (
    <SakDetaljSidePanel
      sak={sak}
      saksbehandlerDetaljer={[]}
      ansvarligSaksbehandler={null}
      tillatteHandlinger={{} as never}
      historikk={[]}
      erEier={false}
      kanTildeleSak={false}
      kanRedigere={false}
      kanLeggeTilHistorikk={false}
      historikkTilstand="vis"
      seksjonsfeil={seksjonsfeil}
    />
  );
  // Feilmeldingen med «Prøv igjen» bruker useRevalidator, som krever en data-router.
  const router = createMemoryRouter([{ path: "/", element: panel }]);
  return render(<RouterProvider router={router} />);
}

describe("SakDetaljSidePanel liggetidsvarsel", () => {
  it("viser varselet før historikken når backend flagger saken", () => {
    renderPanel(true);

    const overskrifter = screen.getAllByRole("heading").map((overskrift) => overskrift.textContent);
    expect(overskrifter).toEqual(["Manglende oppdatering", "Historikk"]);
    expect(screen.getByText("Saken har ikke vært oppdatert på 30 dager")).toBeTruthy();
  });

  it.each([false, undefined])("viser ikke varselet når flagget er %s", (verdi) => {
    renderPanel(verdi);

    expect(screen.queryByRole("heading", { name: "Manglende oppdatering" })).toBeNull();
    expect(screen.queryByText("Saken har ikke vært oppdatert på 30 dager")).toBeNull();
  });
});

describe("SakDetaljSidePanel seksjonsfeil for henleggelsesnotater", () => {
  it("viser feilmelding med feil-ID når notatene ikke kunne hentes", () => {
    renderPanel(undefined, { henleggelsesnotater: "feil-123" });

    expect(
      screen.getByRole("heading", {
        name: "Vi fikk ikke hentet notatene som er registrert ved henleggelsen",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/feil-123/)).toBeTruthy();
  });

  it("viser ingen feilmelding uten seksjonsfeil", () => {
    renderPanel();
    expect(screen.queryByText(/notatene som er registrert/)).toBeNull();
  });
});
