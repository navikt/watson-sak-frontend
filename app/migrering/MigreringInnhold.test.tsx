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
  it("merker siden som prototype med mockantall og riktige fanepaneler", () => {
    renderSide();
    expect(screen.getByRole("heading", { name: "Migrering" })).not.toBeNull();
    expect(screen.getByText("Prototype – kun syntetiske eksempler")).not.toBeNull();
    expect(
      screen
        .getByRole("tab", { name: `Mine saker (${lister.mine.length})` })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("tabpanel", { name: `Mine saker (${lister.mine.length})` }),
    ).not.toBeNull();
    expect(screen.getByText("Ada Eksempel")).not.toBeNull();
    expect(screen.queryByText("Fie Eksempel")).toBeNull();
  });

  it("holder utredning og SV adskilt selv når PID er lik", () => {
    renderSide();
    expect(screen.getAllByText("100245")).toHaveLength(2);
    expect(screen.getByText("Ada Eksempel")).not.toBeNull();
    expect(screen.getByText("Ester Eksempel")).not.toBeNull();
  });

  it("viser søkeloggtreff under ubekreftet ansvar, ikke Mine saker", () => {
    renderSide();
    expect(screen.queryByText("Arne Arbeidsavklaring")).toBeNull();
    fireEvent.click(
      screen.getByRole("tab", {
        name: `Uten bekreftet ansvarlig (${lister.utenBekreftetAnsvarlig.length})`,
      }),
    );
    expect(screen.getByText("Arne Arbeidsavklaring")).not.toBeNull();
    expect(screen.getByText("Kun søkeloggtreff – ansvar ubekreftet")).not.toBeNull();
    expect(screen.queryByText("Ada Eksempel")).toBeNull();
    expect(
      screen.getByRole("tabpanel", {
        name: `Uten bekreftet ansvarlig (${lister.utenBekreftetAnsvarlig.length})`,
      }),
    ).not.toBeNull();
  });

  it("søker uten hensyn til store bokstaver og omkringliggende mellomrom", () => {
    renderSide();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  ADA  " } });
    expect(screen.getByText("Ada Eksempel")).not.toBeNull();
    expect(screen.queryByText("Bente Eksempel")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(`Viser 1 av ${lister.mine.length}`);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "finnes ikke" } });
    expect(screen.getByText(/Ingen eksempler funnet/)).not.toBeNull();
  });

  it("filtrerer på avklaringsbehov uten å merke resultatregistrering som avsluttet", () => {
    renderSide();
    fireEvent.change(screen.getByRole("combobox", { name: "Foreløpig vurdering" }), {
      target: { value: "MA_AVKLARES" },
    });
    expect(screen.getByText("Bente Eksempel")).not.toBeNull();
    expect(screen.getByText("Dag Eksempel")).not.toBeNull();
    expect(screen.queryByText("Ada Eksempel")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain(`Viser 2 av ${lister.mine.length}`);
  });

  it("viser grunnlag for henlagt under avklaring uten utredningsresultat og kan lukke modal", () => {
    renderSide();
    fireEvent.click(screen.getByRole("button", { name: /Se grunnlag for Bente Eksempel/ }));
    const dialog = screen.getByRole("dialog", { name: "Grunnlag for foreløpig vurdering" });
    expect(within(dialog).getByText(/TIPSAVKL er 'Henlagt'/)).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "UTREDRES Mangler (NULL)" })).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "FERDIGDATO 2023-03-01" })).not.toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Lukk grunnlag" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("viser SV-felt og advarsel om dato uten resultat", () => {
    renderSide();
    fireEvent.click(
      screen.getByRole("tab", {
        name: `Uten bekreftet ansvarlig (${lister.utenBekreftetAnsvarlig.length})`,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Se grunnlag for Geir Eksempel/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("row", { name: "SVMOTTATT 2022-04-10" })).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "SVDATO 2022-05-01" })).not.toBeNull();
    expect(within(dialog).getByRole("row", { name: "SVRES Mangler (NULL)" })).not.toBeNull();
    expect(within(dialog).getByText(/SVMOTTATT og SVDATO er satt/)).not.toBeNull();
  });

  it("har egne POST-skjema per kandidat som sender fnr for bekreftet ansvar, aldri for uten ansvarlig", () => {
    const { container } = renderSide();

    fireEvent.click(screen.getByRole("tab", { name: `Mine saker (${lister.mine.length})` }));
    const knapperMine = screen.getAllByRole("button", { name: "Opprett sak" });
    expect(knapperMine.length).toBeGreaterThan(0);
    for (const knapp of knapperMine) {
      expect((knapp as HTMLButtonElement).disabled).toBeFalsy();
      expect(knapp.getAttribute("aria-describedby")).toBe("migrering-opprettelse-info");
      const form = knapp.closest("form");
      expect(form).not.toBeNull();
      expect(form?.getAttribute("method")).toBe("post");
      expect(form?.getAttribute("action")).toBe("/api/registrer-sak/forhåndsutfyll");
      expect(form?.querySelector('input[name="legacyPid"]')).not.toBeNull();
      expect(form?.querySelector('input[name="legacyKilde"]')).not.toBeNull();
      // Bekreftet ansvar: kandidaten er allerede innloggede saksbehandlers egen
      // sak, så fnr sendes med for å forhåndsutfylle person på /registrer-sak
      // (Figma-skjerm 2). Se avsnitt 10 i migrering-avklaringer.md.
      expect(form?.querySelector('input[name="fnr"]')).not.toBeNull();
    }
    expect(container.querySelectorAll("form").length).toBe(knapperMine.length);

    fireEvent.click(
      screen.getByRole("tab", {
        name: `Uten bekreftet ansvarlig (${lister.utenBekreftetAnsvarlig.length})`,
      }),
    );
    const knapperUkjent = screen.getAllByRole("button", { name: "Opprett sak" });
    expect(knapperUkjent.length).toBeGreaterThan(0);
    for (const knapp of knapperUkjent) {
      expect((knapp as HTMLButtonElement).disabled).toBe(true);
      expect(knapp.getAttribute("aria-describedby")).toBe("migrering-opprettelse-krever-ansvar");
    }

    expect(screen.queryByText(/Overført til Watson/)).toBeNull();
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
