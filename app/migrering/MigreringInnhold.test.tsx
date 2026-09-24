import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MigreringInnhold } from "./MigreringInnhold";
import { hentMockMigreringKandidater } from "./mock-data.server";
import type { MigreringLister } from "./types";

const kandidater = hentMockMigreringKandidater("L999999");
const lister: MigreringLister = {
  mine: kandidater.filter((k) => k.ansvar.type === "BEKREFTET"),
  utenBekreftetAnsvarlig: kandidater.filter((k) => k.ansvar.type !== "BEKREFTET"),
};

function renderSide() {
  return render(<MigreringInnhold lister={lister} />);
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

  it("har ingen POST-flyt eller skjulte FNR og sperrer alle opprettelsesknapper", () => {
    const { container } = renderSide();
    for (const navn of [
      `Mine saker (${lister.mine.length})`,
      `Uten bekreftet ansvarlig (${lister.utenBekreftetAnsvarlig.length})`,
    ]) {
      fireEvent.click(screen.getByRole("tab", { name: navn }));
      const knapper = screen.getAllByRole("button", { name: "Opprett sak" });
      expect(knapper.length).toBeGreaterThan(0);
      for (const knapp of knapper) {
        expect((knapp as HTMLButtonElement).disabled).toBe(true);
        expect(knapp.getAttribute("aria-describedby")).toBe("migrering-opprettelse-sperret");
      }
      expect(container.querySelector("form")).toBeNull();
      expect(container.querySelector('input[name="fnr"]')).toBeNull();
      expect(screen.queryByText(/Overført til Watson/)).toBeNull();
    }
  });

  it("skiller målte utvalg fra mockantall og viser ubesvarte spørsmål", () => {
    renderSide();
    const kort = screen.getByRole("region", { name: "Målte utvalg og åpne avklaringer" });
    fireEvent.click(within(kort).getByRole("button", { name: "Vis mer" }));
    const tabell = screen.getByRole("table", { name: "Målte delutvalg i KT_TABELLPERSON" });
    expect(within(tabell).getByText("1 396 (674 + 722)")).not.toBeNull();
    expect(within(tabell).getByText("580")).not.toBeNull();
    expect(within(tabell).getByText("4")).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Tre ubesvarte spørsmål til fagansvarlig" }),
    ).not.toBeNull();
    expect(screen.getByText(/Ingen av tallene er et godkjent migreringsvolum/)).not.toBeNull();
  });
});
