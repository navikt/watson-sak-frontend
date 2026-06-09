import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { DokumentEditor } from "./DokumentEditor";

const innhold: DokumentInnhold = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Min overskrift" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Brødtekst her" }],
    },
  ],
};

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

    // Editoren rendrer en faktisk <table>, og endringen propageres som Tiptap-JSON.
    expect(document.querySelector("table")).not.toBeNull();
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
});
