import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { MigreringInnhold } from "./MigreringInnhold";
import { hentMockMigreringKandidater } from "./mock-data.server";
import type { MigreringLister } from "./types";

const kandidater = hentMockMigreringKandidater("L999999");
const lister: MigreringLister = {
  mine: kandidater.filter((k) => k.ansvar.type === "BEKREFTET"),
  utenBekreftetAnsvarlig: kandidater.filter((k) => k.ansvar.type !== "BEKREFTET"),
};

function renderSide() {
  const Stub = createRoutesStub([
    {
      path: "/migrering",
      Component: () => <MigreringInnhold lister={lister} />,
    },
    {
      path: "/api/registrer-sak/forhåndsutfyll",
      action: () => null,
    },
  ]);
  return render(<Stub initialEntries={["/migrering"]} />);
}

describe("MigreringInnhold", () => {
  it("viser tabell iht Figma-skisse: PID, Personnummer, Opprettet i Access", () => {
    renderSide();
    expect(screen.getByRole("heading", { name: "Migreringsveileder" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "PID" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Personnummer" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Opprettet i Access" })).not.toBeNull();
  });

  it("viser alle kandidater i én flat liste", () => {
    renderSide();
    const antallForventet = lister.mine.length + lister.utenBekreftetAnsvarlig.length;
    expect(screen.getAllByRole("row")).toHaveLength(antallForventet + 1); // +1 for header-raden
  });

  it("holder utredning og SV adskilt selv når PID er lik", () => {
    renderSide();
    expect(screen.getAllByText("100245")).toHaveLength(2);
  });

  it("viser personnummer bare for bekreftet ansvar, aldri for uten ansvarlig", () => {
    renderSide();
    const adaCelle = screen.getByText("11111111111");
    const adaRad = adaCelle.closest("tr");
    expect(adaRad).not.toBeNull();
    expect(within(adaRad!).getByText("100245")).not.toBeNull();

    const arnePidCelle = screen.getByText("800202");
    const arneRad = arnePidCelle.closest("tr");
    expect(arneRad).not.toBeNull();
    expect(within(arneRad!).getAllByText("–")).toHaveLength(2);
  });

  it("sender fnr for bekreftet ansvar, aldri for uten ansvarlig", () => {
    const { container } = renderSide();
    const knapper = screen.getAllByRole("button", { name: "Opprett sak" });
    expect(knapper.length).toBe(lister.mine.length + lister.utenBekreftetAnsvarlig.length);
    expect(container.querySelectorAll("form").length).toBe(knapper.length);

    let antallBekreftet = 0;
    let antallIkkeBekreftet = 0;
    for (const knapp of knapper) {
      const form = knapp.closest("form");
      expect(form?.querySelector('input[name="legacyPid"]')).not.toBeNull();
      expect(form?.querySelector('input[name="legacyKilde"]')).not.toBeNull();
      const fnrFelt = form?.querySelector('input[name="fnr"]');
      if ((knapp as HTMLButtonElement).disabled) {
        antallIkkeBekreftet++;
        expect(fnrFelt).toBeNull();
      } else {
        antallBekreftet++;
        expect(fnrFelt).not.toBeNull();
      }
    }
    expect(antallBekreftet).toBe(lister.mine.length);
    expect(antallIkkeBekreftet).toBe(lister.utenBekreftetAnsvarlig.length);
  });
});
