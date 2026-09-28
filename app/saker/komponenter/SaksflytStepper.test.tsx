import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaksflytStepper } from "./SaksflytStepper";

function hentSteg() {
  return within(screen.getByRole("list", { name: "Saksflyt" })).getAllByRole("listitem");
}

describe("SaksflytStepper", () => {
  it("viser alle stegene i saksflyten med status for skjermlesere", () => {
    render(<SaksflytStepper steg="STRAFFERETTSLIG_VURDERING" />);

    expect(hentSteg().map((steg) => steg.textContent)).toEqual([
      "Opprettet, fullført",
      "Utredning, fullført",
      "Forvaltning, fullført",
      "Strafferettslig vurdering, gjeldende steg",
      "Politiet, ikke startet",
      "Avsluttet, ikke startet",
    ]);
  });

  it("markerer gjeldende steg med aria-current", () => {
    render(<SaksflytStepper steg="FORVALTNING" />);

    const steg = hentSteg();
    expect(steg[2].getAttribute("aria-current")).toBe("step");
    expect(steg.filter((s) => s.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("slår sammen tilsvarende backend-steg", () => {
    render(<SaksflytStepper steg="ANMELDT" />);

    expect(hentSteg()[4].getAttribute("aria-current")).toBe("step");
  });

  it("markerer alle steg som fullført når saken er avsluttet", () => {
    render(<SaksflytStepper steg="AVSLUTTET" />);

    expect(hentSteg().every((s) => s.dataset.tilstand === "fullført")).toBe(true);
  });
});
