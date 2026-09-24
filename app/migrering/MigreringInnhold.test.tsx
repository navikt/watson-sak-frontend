import { fireEvent, render, screen, within } from "@testing-library/react";
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
  it("merker siden som prototype og viser flat tabell iht Figma-skisse", () => {
    renderSide();
    expect(screen.getByRole("heading", { name: "Migreringsveileder" })).not.toBeNull();
    expect(screen.getByText("Prototype – kun syntetiske eksempler")).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "PID" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Personnummer" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Opprettet i Access" })).not.toBeNull();
  });

  it("viser alle kandidater i én flat liste, uten faner eller kategorier", () => {
    renderSide();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("searchbox")).toBeNull();
    const antallForventet = lister.mine.length + lister.utenBekreftetAnsvarlig.length;
    expect(screen.getAllByRole("row")).toHaveLength(antallForventet + 1); // +1 for header-raden
  });

  it("holder utredning og SV adskilt selv når PID er lik", () => {
    renderSide();
    expect(screen.getAllByText("100245")).toHaveLength(2);
  });

  it("viser personnummer bare for bekreftet ansvar, aldri for uten ansvarlig", () => {
    renderSide();
    // Ada Eksempel (UTREDNING:100245, BEKREFTET) har syntetisk personIdent i mockdata
    const adaCelle = screen.getByText("111111 11111");
    const adaRad = adaCelle.closest("tr");
    expect(adaRad).not.toBeNull();
    expect(within(adaRad!).getByText("100245")).not.toBeNull();

    // Arne Arbeidsavklaring (NKA_AAP:800202, LOGGTREFF) har aldri personIdent
    const arnePidCelle = screen.getByText("800202");
    const arneRad = arnePidCelle.closest("tr");
    expect(arneRad).not.toBeNull();
    // Personnummer og referansedato er begge tomme for denne kandidaten
    expect(within(arneRad!).getAllByText("–")).toHaveLength(2);
  });

  it("viser grunnlag for henlagt under avklaring uten utredningsresultat og kan lukke modal", () => {
    renderSide();
    fireEvent.click(screen.getByRole("button", { name: "Se grunnlag for PID 100310" }));
    const dialog = screen.getByRole("dialog", { name: "Grunnlag for foreløpig vurdering" });
    expect(within(dialog).getByText("Bente Eksempel")).not.toBeNull();
    expect(within(dialog).getByText(/TIPSAVKL er 'Henlagt'/)).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "UTREDRES Mangler (NULL)" })).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "FERDIGDATO 2023-03-01" })).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Lukk grunnlag" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("viser SV-felt og advarsel om dato uten resultat for kandidat uten bekreftet ansvar", () => {
    renderSide();
    fireEvent.click(screen.getByRole("button", { name: "Se grunnlag for PID 100634" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Geir Eksempel")).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "SVMOTTATT 2022-04-10" })).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "SVDATO 2022-05-01" })).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "SVRES Mangler (NULL)" })).not.toBeNull();
    expect(within(dialog).getByText(/SVMOTTATT og SVDATO er satt/)).not.toBeNull();
  });

  it("har egne POST-skjema per kandidat som sender fnr for bekreftet ansvar, aldri for uten ansvarlig", () => {
    const { container } = renderSide();

    const knapper = screen.getAllByRole("button", { name: "Opprett sak" });
    expect(knapper.length).toBe(lister.mine.length + lister.utenBekreftetAnsvarlig.length);
    expect(container.querySelectorAll("form").length).toBe(knapper.length);

    let antallBekreftet = 0;
    let antallIkkeBekreftet = 0;
    for (const knapp of knapper) {
      const form = knapp.closest("form");
      expect(form).not.toBeNull();
      expect(form?.getAttribute("method")).toBe("post");
      expect(form?.getAttribute("action")).toBe("/api/registrer-sak/forhåndsutfyll");
      expect(form?.querySelector('input[name="legacyPid"]')).not.toBeNull();
      expect(form?.querySelector('input[name="legacyKilde"]')).not.toBeNull();

      const erDeaktivert = (knapp as HTMLButtonElement).disabled;
      const fnrFelt = form?.querySelector('input[name="fnr"]');
      if (erDeaktivert) {
        antallIkkeBekreftet++;
        expect(knapp.getAttribute("aria-describedby")).toBe("migrering-opprettelse-krever-ansvar");
        expect(fnrFelt).toBeNull();
      } else {
        antallBekreftet++;
        expect(knapp.getAttribute("aria-describedby")).toBe("migrering-opprettelse-info");
        // Bekreftet ansvar: kandidaten er allerede innloggede saksbehandlers egen
        // sak, så fnr sendes med for å forhåndsutfylle person på /registrer-sak
        // (Figma-skjerm 2). Se avsnitt 10 i migrering-avklaringer.md.
        expect(fnrFelt).not.toBeNull();
      }
    }
    expect(antallBekreftet).toBe(lister.mine.length);
    expect(antallIkkeBekreftet).toBe(lister.utenBekreftetAnsvarlig.length);
  });

  it("viser målte utvalg og statusregler i informasjonskort", () => {
    renderSide();
    const kort = screen.getByRole("region", { name: "Målte utvalg og statusregler" });
    fireEvent.click(within(kort).getByRole("button", { name: "Vis mer" }));
    const tabell = screen.getByRole("table", { name: "Kategorier og forventet antall" });
    expect(within(tabell).getByText("586")).not.toBeNull();
    expect(within(tabell).getByText("612")).not.toBeNull();
    expect(within(tabell).getByText("420 (434)")).not.toBeNull();
    expect(within(tabell).getByText("637")).not.toBeNull();
    expect(within(tabell).getByText("77")).not.toBeNull();
    expect(within(tabell).getByText("60")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Spesielle merknader" })).not.toBeNull();
  });
});
