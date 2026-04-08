import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";
import type { FordelingSak } from "./typer";

vi.mock("~/saker/handlinger/TildelSaksbehandlerModal", () => ({
  TildelSaksbehandlerModal: () => null,
}));

const lagSak = (overstyringer: Partial<FordelingSak> = {}): FordelingSak => ({
  id: "1",
  opprettetDato: "2026-01-13",
  kategori: "Arbeid",
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
});
