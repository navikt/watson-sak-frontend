import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import type { FilResponse } from "./typer";
import { VedleggSeksjon } from "./VedleggSeksjon";

const mockFiler: FilResponse[] = [
  {
    id: "fil-1",
    filnavn: "anmeldelse.pdf",
    storrelse: 204800,
    contentType: "application/pdf",
    opprettetAv: "Ola Nordmann",
    opprettet: "2026-02-15T10:30:00Z",
  },
  {
    id: "fil-2",
    filnavn: "screenshot.png",
    storrelse: 51200,
    contentType: "image/png",
    opprettetAv: "Kari Hansen",
    opprettet: "2026-03-01T14:00:00Z",
  },
];

function renderSeksjon(props: Parameters<typeof VedleggSeksjon>[0]) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => <VedleggSeksjon {...props} />,
    },
  ]);
  return render(<Stub initialEntries={["/saker/SAK-1"]} />);
}

describe("VedleggSeksjon", () => {
  it("viser 'Ingen vedlegg ennå' når listen er tom", () => {
    renderSeksjon({ filer: [], sakId: "SAK-1", erSakseier: false, kanLasteOpp: false });
    expect(screen.getByText("Ingen vedlegg ennå.")).toBeDefined();
  });

  it("viser heading 'Vedlegg'", () => {
    renderSeksjon({ filer: [], sakId: "SAK-1", erSakseier: false, kanLasteOpp: false });
    expect(screen.getByText("Vedlegg")).toBeDefined();
  });

  it("viser filnavn for hver fil", () => {
    renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false, kanLasteOpp: false });
    expect(screen.getByText("anmeldelse.pdf")).toBeDefined();
    expect(screen.getByText("screenshot.png")).toBeDefined();
  });

  it("viser størrelse i KB", () => {
    renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false, kanLasteOpp: false });
    expect(screen.getByText("200 KB")).toBeDefined();
    expect(screen.getByText("50 KB")).toBeDefined();
  });

  it("viser hvem som lastet opp", () => {
    renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false, kanLasteOpp: false });
    expect(screen.getByText("Ola Nordmann")).toBeDefined();
    expect(screen.getByText("Kari Hansen")).toBeDefined();
  });

  it("viser nedlastingsknapp for hver fil", () => {
    renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false, kanLasteOpp: false });
    expect(screen.getByLabelText("Last ned anmeldelse.pdf")).toBeDefined();
    expect(screen.getByLabelText("Last ned screenshot.png")).toBeDefined();
  });

  it("viser ikke slett-knapp når erSakseier er false", () => {
    renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false, kanLasteOpp: false });
    expect(screen.queryByLabelText("Slett anmeldelse.pdf")).toBeNull();
  });

  it("viser slett-knapp kun når erSakseier er true", () => {
    renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: true, kanLasteOpp: false });
    expect(screen.getByLabelText("Slett anmeldelse.pdf")).toBeDefined();
    expect(screen.getByLabelText("Slett screenshot.png")).toBeDefined();
  });

  it("viser 'Last opp fil'-label i dropzone når kanLasteOpp er true", () => {
    renderSeksjon({ filer: [], sakId: "SAK-1", erSakseier: false, kanLasteOpp: true });
    expect(screen.getByText("Last opp fil")).toBeDefined();
  });

  it("skjuler dropzone når kanLasteOpp er false", () => {
    renderSeksjon({ filer: [], sakId: "SAK-1", erSakseier: false, kanLasteOpp: false });
    expect(screen.queryByText("Last opp fil")).toBeNull();
  });
});
