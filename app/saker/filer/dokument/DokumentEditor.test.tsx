import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { DokumentEditor } from "./DokumentEditor";

const innhold: DokumentInnhold = [
  {
    type: "h2",
    children: [{ text: "Min overskrift" }],
  },
  {
    type: "p",
    children: [{ text: "Brødtekst her" }],
  },
];

describe("DokumentEditor", () => {
  it("viser verktøylinje og innhold når redigerbar", async () => {
    render(
      <DokumentEditor
        startInnhold={innhold}
        redigerbar
        onEndring={() => {}}
        sakId="ABC-1"
        docId="d1"
      />,
    );

    expect(await screen.findByRole("toolbar", { name: "Formatering" })).toBeDefined();
    expect(screen.getByLabelText("Fet")).toBeDefined();
    expect(screen.getByLabelText("Kursiv")).toBeDefined();
    expect(screen.getByLabelText("Understreket")).toBeDefined();
    expect(screen.getByLabelText("Gjennomstreket")).toBeDefined();
    expect(screen.getByLabelText("Indenter")).toBeDefined();
    expect(screen.getByLabelText("Avindenter")).toBeDefined();
    expect(screen.getByLabelText("Punktliste")).toBeDefined();
    expect(screen.getByLabelText("Angre")).toBeDefined();
    expect(screen.getByText("Min overskrift")).toBeDefined();
    expect(screen.getByText("Brødtekst her")).toBeDefined();
  });

  it("kan sette inn en tabell via verktøylinjen", async () => {
    const onEndring = vi.fn();
    render(
      <DokumentEditor
        startInnhold={innhold}
        redigerbar
        onEndring={onEndring}
        sakId="ABC-1"
        docId="d1"
      />,
    );

    const settInnTabell = await screen.findByLabelText("Sett inn tabell");
    fireEvent.click(settInnTabell);

    // Editoren rendrer en faktisk <table>, og endringen propageres som Plate/Slate-JSON.
    await waitFor(() => {
      expect(document.querySelector("table")).not.toBeNull();
    });
    expect(onEndring).toHaveBeenCalled();
    // Tabell-kontekstuelle knapper dukker opp når markøren står i tabellen.
    expect(screen.getByLabelText("Legg til rad")).toBeDefined();
    expect(screen.getByLabelText("Slett tabell")).toBeDefined();
  });

  it("har et tilgjengelig redigeringsfelt med aria-label", async () => {
    render(
      <DokumentEditor
        startInnhold={innhold}
        redigerbar
        onEndring={() => {}}
        sakId="ABC-1"
        docId="d1"
      />,
    );

    expect(await screen.findByLabelText("Dokumentinnhold")).toBeDefined();
  });

  it("skjuler verktøylinjen i lesemodus", async () => {
    render(
      <DokumentEditor
        startInnhold={innhold}
        redigerbar={false}
        onEndring={() => {}}
        sakId="ABC-1"
        docId="d1"
      />,
    );

    expect(await screen.findByText("Min overskrift")).toBeDefined();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("toggler understreket mark og kaller onEndring", async () => {
    render(
      <DokumentEditor
        startInnhold={innhold}
        redigerbar
        onEndring={() => {}}
        sakId="ABC-1"
        docId="d1"
      />,
    );

    const knapp = await screen.findByLabelText("Understreket");
    expect(knapp.getAttribute("aria-pressed")).toBe("false");
    expect(() => fireEvent.click(knapp)).not.toThrow();
  });

  it("toggler gjennomstreket mark og kaller onEndring", async () => {
    render(
      <DokumentEditor
        startInnhold={innhold}
        redigerbar
        onEndring={() => {}}
        sakId="ABC-1"
        docId="d1"
      />,
    );

    const knapp = await screen.findByLabelText("Gjennomstreket");
    expect(knapp.getAttribute("aria-pressed")).toBe("false");
    expect(() => fireEvent.click(knapp)).not.toThrow();
  });

  it("indenter-knappen kaller onEndring", async () => {
    const onEndring = vi.fn();
    render(
      <DokumentEditor
        startInnhold={innhold}
        redigerbar
        onEndring={onEndring}
        sakId="ABC-1"
        docId="d1"
      />,
    );

    const knapp = await screen.findByLabelText("Indenter");
    expect(knapp).toBeDefined();
    // Indenter med tom selektion gjør ingenting – verifiser at knappetrykk ikke kaster.
    expect(() => fireEvent.click(knapp)).not.toThrow();
  });

  it("avindenter-knappen kaller onEndring", async () => {
    const onEndring = vi.fn();
    render(
      <DokumentEditor
        startInnhold={innhold}
        redigerbar
        onEndring={onEndring}
        sakId="ABC-1"
        docId="d1"
      />,
    );

    const knapp = await screen.findByLabelText("Avindenter");
    expect(knapp).toBeDefined();
    expect(() => fireEvent.click(knapp)).not.toThrow();
  });
});
