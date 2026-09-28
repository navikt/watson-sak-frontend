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
const tilBehandling = kandidater.filter((k) => !k.alleredeMigrertTilKontrollsakId);
const overført = kandidater.filter((k) => k.alleredeMigrertTilKontrollsakId);

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
    {
      path: "/saker/:sakId",
      Component: () => <div>Saksdetaljer</div>,
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
    expect(screen.getByRole("columnheader", { name: "Migreringsstatus" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Handling" })).not.toBeNull();
  });

  it("viser lenke til sak og eksplisitt migreringsstatus hver for seg", () => {
    renderSide();
    expect(overført.length).toBeGreaterThan(0);
    const sakLenke = screen.getByRole("link", { name: "Åpne sak" });
    const rad = sakLenke.closest("tr");
    expect(rad).not.toBeNull();
    if (!rad) throw new Error("Fant ikke raden for sak med kobling");
    expect(within(rad).getByText("100245")).not.toBeNull();
    expect(within(rad).getByText("Fullstendig")).not.toBeNull();
    expect(within(rad).queryByRole("button", { name: "Opprett sak" })).toBeNull();
  });

  it("holder utredning og SV adskilt med hver sin status selv når PID er lik", () => {
    renderSide();
    const rader = screen.getAllByText("100245").map((celle) => celle.closest("tr"));
    expect(rader).toHaveLength(2);
    if (!rader[0] || !rader[1]) throw new Error("Fant ikke begge migreringsradene");
    expect(within(rader[0]).getByText("Fullstendig")).not.toBeNull();
    expect(within(rader[1]).getByText("Ikke påbegynt")).not.toBeNull();
  });

  it("sakskobling betyr ikke at migrering er fullstendig", () => {
    const kandidat = { ...overført[0], migreringsstatus: "UNDER_MIGRERING" as const };
    const Stub = createRoutesStub([
      {
        path: "/migrering",
        Component: () => (
          <MigreringInnhold lister={{ mine: [kandidat], utenBekreftetAnsvarlig: [] }} />
        ),
      },
    ]);
    render(<Stub initialEntries={["/migrering"]} />);
    expect(screen.getByRole("link", { name: "Åpne sak" })).not.toBeNull();
    expect(screen.getByText("Under migrering")).not.toBeNull();
    expect(screen.queryByText("Fullstendig")).toBeNull();
  });

  it("skjuler statusendring inntil autorisasjon og faglige overganger er implementert", () => {
    // TODO SAK-67, rød sone: test autorisert manuell overgang når backend er klar.
    renderSide();
    expect(screen.queryByRole("button", { name: "Merk migrering fullstendig" })).toBeNull();
  });

  it("viser personnummer for alle kandidater til behandling — vi har ikke uten_ansvarlig", () => {
    renderSide();
    expect(lister.utenBekreftetAnsvarlig).toHaveLength(0);

    const arnePidCelle = screen.getByText("800202");
    const arneRad = arnePidCelle.closest("tr");
    expect(arneRad).not.toBeNull();
    expect(within(arneRad!).getByText("11223344556")).not.toBeNull();
  });

  it("sender fnr for alle kandidater til behandling når Opprett sak trykkes", () => {
    const { container } = renderSide();
    const knapper = screen.getAllByRole("button", { name: "Opprett sak" });
    expect(knapper.length).toBe(tilBehandling.length);
    expect(container.querySelectorAll("form").length).toBe(knapper.length);

    for (const knapp of knapper) {
      expect((knapp as HTMLButtonElement).disabled).toBe(false);
      const form = knapp.closest("form");
      expect(form?.querySelector('input[name="legacyPid"]')).not.toBeNull();
      expect(form?.querySelector('input[name="legacyKilde"]')).not.toBeNull();
      expect(form?.querySelector('input[name="fnr"]')).not.toBeNull();
    }
  });
});
