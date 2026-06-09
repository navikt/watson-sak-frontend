import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
    render(<DokumentEditor startInnhold={innhold} redigerbar onEndring={() => {}} />);

    expect(await screen.findByRole("toolbar", { name: "Formatering" })).toBeDefined();
    expect(screen.getByLabelText("Fet")).toBeDefined();
    expect(screen.getByLabelText("Kursiv")).toBeDefined();
    expect(screen.getByLabelText("Punktliste")).toBeDefined();
    expect(screen.getByLabelText("Angre")).toBeDefined();
    expect(screen.getByText("Min overskrift")).toBeDefined();
    expect(screen.getByText("Brødtekst her")).toBeDefined();
  });

  it("har et tilgjengelig redigeringsfelt med aria-label", async () => {
    render(<DokumentEditor startInnhold={innhold} redigerbar onEndring={() => {}} />);

    expect(await screen.findByLabelText("Dokumentinnhold")).toBeDefined();
  });

  it("skjuler verktøylinjen i lesemodus", async () => {
    render(<DokumentEditor startInnhold={innhold} redigerbar={false} onEndring={() => {}} />);

    expect(await screen.findByText("Min overskrift")).toBeDefined();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });
});
