import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import type { Sak } from "~/saker/typer";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";

vi.mock("~/saker/handlinger/TildelSaksbehandlerModal", () => ({
  TildelSaksbehandlerModal: () => null,
}));

const lagSak = (overstyringer: Partial<Sak> = {}): Sak => ({
  id: "1",
  datoInnmeldt: "2026-01-13",
  kilde: "telefon",
  notat: "Tips om mulig feilutbetaling",
  fødselsnummer: "12345678901",
  ytelser: ["Dagpenger"],
  status: "tips mottatt",
  seksjon: "Seksjon A",
  tags: [],
  ...overstyringer,
});

describe("UfordelteSakerInnhold", () => {
  it("bruker ikke ekstra section-landmarks for oppsummeringskortene", () => {
    const { container } = render(
      <MemoryRouter>
        <UfordelteSakerInnhold saker={[lagSak()]} saksbehandlere={["Kari Nordmann"]} />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll("section")).toHaveLength(1);
  });
});
