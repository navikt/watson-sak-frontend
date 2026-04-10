import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";
import type { FordelingSak } from "./typer";

vi.mock("~/saker/handlinger/TildelSaksbehandlerModal", () => ({
  TildelSaksbehandlerModal: () => null,
}));

const lagSak = (overstyringer: Partial<FordelingSak> = {}): FordelingSak => ({
  id: lagMockSakUuid("301", 2),
  navn: "Kari Nordmann",
  opprettetDato: "2026-01-13",
  oppdatertDato: "2026-01-14",
  kategori: "Arbeid",
  misbrukstyper: ["Skjult samliv"],
  ytelser: ["Dagpenger"],
  ...overstyringer,
});

describe("UfordelteSakerInnhold", () => {
  it("bruker ikke ekstra section-landmarks for oppsummeringskortene", () => {
    const { container } = render(
      <MemoryRouter>
        <UfordelteSakerInnhold
          saker={[lagSak()]}
          saksbehandlere={["Kari Nordmann"]}
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
          submitPath={RouteConfig.FORDELING}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("columnheader", { name: "Saksid" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "Navn" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Misbrukstype" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Oppdatert" })).toBeDefined();
    expect(screen.getByRole("link", { name: "301" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Tildel" })).toBeDefined();
  });
});
