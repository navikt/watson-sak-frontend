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
    expect(screen.getAllByRole("columnheader", { name: "PID" })).not.toHaveLength(0);
    expect(screen.getByRole("columnheader", { name: "Personnummer" })).not.toBeNull();
    expect(screen.getAllByRole("columnheader", { name: "Opprettet i Access" })).not.toHaveLength(0);
  });

  it("viser kandidater til behandling i hovedtabellen, overførte i egen seksjon", () => {
    renderSide();
    expect(overført.length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 2, name: "Overført til Watson" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Navn" })).not.toBeNull();
    expect(screen.getByText("Ada Eksempel")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Overført til Watson" })).not.toBeNull();
  });

  it("holder utredning og SV adskilt selv når PID er lik", () => {
    renderSide();
    expect(screen.getAllByText("100245")).toHaveLength(2);
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
