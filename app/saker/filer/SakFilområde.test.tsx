import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SakFilområde } from "./SakFilområde";
import type { FilNode } from "./typer";

const mockFiler: FilNode[] = [
  {
    id: "1",
    type: "mappe",
    navn: "Dokumentasjon",
    sharepointUrl: "https://example.com/docs",
    barn: [
      {
        id: "1-1",
        type: "fil",
        navn: "Rapport.pdf",
        format: "pdf",
        endretAv: "Ola Nordmann",
        endretDato: "2026-02-15",
        sharepointUrl: "https://example.com/docs/rapport.pdf",
      },
    ],
  },
  {
    id: "2",
    type: "fil",
    navn: "Notat.docx",
    format: "word",
    endretAv: "Kari Hansen",
    endretDato: "2026-03-01",
    sharepointUrl: "https://example.com/notat.docx",
  },
];

describe("SakFilområde", () => {
  it("viser tomtilstand når det ikke er noen filer", () => {
    render(<SakFilområde filer={[]} />);
    expect(screen.getByText("Ingen filer ennå")).toBeDefined();
    expect(screen.getByText("Last opp fil")).toBeDefined();
    expect(screen.getByText("Opprett mappe")).toBeDefined();
  });

  it("viser heading 'Filer' alltid", () => {
    render(<SakFilområde filer={[]} />);
    expect(screen.getByText("Filer")).toBeDefined();
  });

  it("viser filer og mapper når det finnes data", () => {
    render(<SakFilområde filer={mockFiler} />);
    expect(screen.getByText("Dokumentasjon")).toBeDefined();
    expect(screen.getByText("Notat.docx")).toBeDefined();
  });

  it("viser format-tag for filer", () => {
    render(<SakFilområde filer={mockFiler} />);
    expect(screen.getByText("Word")).toBeDefined();
  });

  it("viser handlingsknapper når det er filer", () => {
    render(<SakFilområde filer={mockFiler} />);
    const lastOppKnapper = screen.getAllByText("Last opp fil");
    expect(lastOppKnapper.length).toBeGreaterThan(0);
  });
});
