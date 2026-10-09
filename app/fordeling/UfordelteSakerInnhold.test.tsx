import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";
import type { FordelingSak } from "./typer";

vi.mock("~/saker/handlinger/TildelSaksbehandlerModal", () => ({
  TildelSaksbehandlerModal: () => null,
}));

const lagSak = (overstyringer: Partial<FordelingSak> = {}): FordelingSak => ({
  id: 301,
  navn: "Kari Nordmann",
  opprettetDato: "2026-01-13",
  oppdatertDato: "2026-01-14",
  kategori: "Arbeid",
  misbrukstyper: ["Skjult samliv"],
  ytelser: ["Dagpenger"],
  merking: [],
  status: null,
  statusKode: null,
  steg: "Opprettet",
  stegKode: "OPPRETTET",
  ...overstyringer,
});

describe("UfordelteSakerInnhold", () => {
  it("viser bare 'Ufordelte saker' som overskrift når ingen filtre er aktive", () => {
    render(
      <MemoryRouter>
        <UfordelteSakerInnhold
          saker={[lagSak()]}
          saksbehandlere={["Kari Nordmann"]}
          saksbehandlerDetaljer={mockSaksbehandlerDetaljer}
          submitPath={RouteConfig.FORDELING}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ufordelte saker");
  });

  it("viser aktive filtre i overskriften når filtre er valgt", () => {
    render(
      <MemoryRouter initialEntries={["/?misbrukstype=Skjult+samliv&merking=Prioritert"]}>
        <UfordelteSakerInnhold
          saker={[
            lagSak(),
            lagSak({ id: 302, misbrukstyper: ["Skjult samliv"], merking: ["Prioritert"] }),
          ]}
          saksbehandlere={["Kari Nordmann"]}
          saksbehandlerDetaljer={mockSaksbehandlerDetaljer}
          submitPath={RouteConfig.FORDELING}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Ufordelte saker – Skjult samliv, Prioritert",
    );
  });

  it("bruker ikke ekstra section-landmarks for oppsummeringskortene", () => {
    const { container } = render(
      <MemoryRouter>
        <UfordelteSakerInnhold
          saker={[lagSak()]}
          saksbehandlere={["Kari Nordmann"]}
          saksbehandlerDetaljer={mockSaksbehandlerDetaljer}
          submitPath={RouteConfig.FORDELING}
        />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll("section")).toHaveLength(1);
  });

  it("viser felles sakslistekolonner uten navn og beholder tildel-handling", () => {
    render(
      <MemoryRouter>
        <UfordelteSakerInnhold
          saker={[lagSak()]}
          saksbehandlere={["Kari Nordmann"]}
          saksbehandlerDetaljer={mockSaksbehandlerDetaljer}
          submitPath={RouteConfig.FORDELING}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("columnheader", { name: "Saksid" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "Navn" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Misbrukstype" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: /Status/ })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: /Steg/ })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: /Opprettet/ })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Oppdatert" })).toBeDefined();
    expect(screen.getByRole("link", { name: "#301" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Tildel" })).toBeDefined();
  });

  describe("sidedeling", () => {
    const mangeSaker = Array.from({ length: 25 }, (_, indeks) => lagSak({ id: 1 + indeks }));

    function renderMedSider(søkestreng = "") {
      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: (
              <UfordelteSakerInnhold
                saker={mangeSaker}
                saksbehandlere={["Kari Nordmann"]}
                saksbehandlerDetaljer={mockSaksbehandlerDetaljer}
                submitPath={RouteConfig.FORDELING}
              />
            ),
          },
        ],
        { initialEntries: [`/${søkestreng}`] },
      );
      render(<RouterProvider router={router} />);
      return router;
    }

    function synligeSakslenker() {
      return screen.getAllByRole("link", { name: /^#\d+$/ });
    }

    it("viser 20 saker på første side", () => {
      renderMedSider();

      const lenker = synligeSakslenker();
      expect(lenker).toHaveLength(20);
      expect(lenker[0].textContent).toBe("#1");
    });

    it("bytter side og oppdaterer URL-en", () => {
      const router = renderMedSider();

      fireEvent.click(screen.getByRole("button", { name: "2" }));

      expect(router.state.location.search).toContain("side=2");
      const lenker = synligeSakslenker();
      expect(lenker).toHaveLength(5);
      expect(lenker[0].textContent).toBe("#21");
    });

    it("går tilbake til første side ved sortering", () => {
      const router = renderMedSider("?side=2");

      fireEvent.click(screen.getByRole("button", { name: "Sorter på kategori" }));

      expect(new URLSearchParams(router.state.location.search).has("side")).toBe(false);
    });
  });
});
