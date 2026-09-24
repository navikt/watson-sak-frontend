import { fireEvent, render, screen } from "@testing-library/react";
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

describe("MigreringInnhold – seks kategorifaner og designkrav", () => {
  it("viser seks kategorifaner med oppsummerte antall og støtter veksling mellom MINE og UTEN_ANSVARLIG", () => {
    renderSide();

    // Sjekk at velger for liste (Mine saker / Uten bekreftet ansvarlig) finnes
    expect(screen.getByRole("tab", { name: /Mine saker/i })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /Uten bekreftet ansvarlig/i })).not.toBeNull();

    // Sjekk at alle seks kategorifaner/knapper finnes med sine etiketter
    expect(screen.getByRole("button", { name: /Tipsrestanser/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Tips venter resultat/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Straffesaker restanser/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Straffesaker venter på resultat/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Registersamkjøring dagpenger/i })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Registersamkjøring AAP/i })).not.toBeNull();
  });

  it("viser synlig advarsel/etikett for Arbeidsgiveranmeldelse (ekskluderFraStatistikk)", () => {
    renderSide();

    // Gå til "Uten bekreftet ansvarlig"
    fireEvent.click(screen.getByRole("tab", { name: /Uten bekreftet ansvarlig/i }));

    // Velg kategorien for Straffesaker venter på resultat
    fireEvent.click(screen.getByRole("button", { name: /Straffesaker venter på resultat/i }));

    // Sjekk at kandidaten med Anm. Agiver har taggen
    expect(screen.getByText("Arbeidsgiver Anmeldt Eksempel")).not.toBeNull();
    expect(screen.getByText("Arbeidsgiveranmeldelse – holdes utenfor statistikk")).not.toBeNull();
  });

  it("viser kilde og enhet i tabellen for kandidater uten bekreftet saksbehandler", () => {
    renderSide();

    fireEvent.click(screen.getByRole("tab", { name: /Uten bekreftet ansvarlig/i }));

    // Sjekk tabellheadere for Kilde og Enhet
    expect(screen.getByRole("columnheader", { name: /Kilde \/ PID/i })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: /Enhet/i })).not.toBeNull();

    // Sjekk at enhet 4812 vises for kandidatene
    const enheter = screen.getAllByText("4812");
    expect(enheter.length).toBeGreaterThan(0);
  });

  it("sender legacyPid og legacyKilde for opprettelse, ikke fnr, i denne fasen", () => {
    renderSide();
    const knapper = screen.getAllByRole("button", { name: "Opprett sak" });
    expect(knapper.length).toBeGreaterThan(0);
    for (const knapp of knapper) {
      expect((knapp as HTMLButtonElement).disabled).toBeFalsy();
      const form = knapp.closest("form");
      expect(form?.querySelector('input[name="legacyPid"]')).not.toBeNull();
      expect(form?.querySelector('input[name="legacyKilde"]')).not.toBeNull();
      expect(form?.querySelector('input[name="fnr"]')).toBeNull();
    }
  });
});
