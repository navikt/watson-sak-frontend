import { fireEvent, render, screen } from "@testing-library/react";
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

  it("ekspanderer mappe ved klikk og viser barn", () => {
    render(<SakFilområde filer={mockFiler} />);
    expect(screen.queryByText("Rapport.pdf")).toBeNull();

    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;
    fireEvent.click(mappeKnapp);

    expect(screen.getByText("Rapport.pdf")).toBeDefined();
  });

  it("kollapser mappe ved nytt klikk", () => {
    render(<SakFilområde filer={mockFiler} />);
    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;

    fireEvent.click(mappeKnapp);
    expect(screen.getByText("Rapport.pdf")).toBeDefined();

    fireEvent.click(mappeKnapp);
    expect(screen.queryByText("Rapport.pdf")).toBeNull();
  });

  it("setter aria-expanded riktig ved toggle av mappe", () => {
    render(<SakFilområde filer={mockFiler} />);
    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;

    expect(mappeKnapp.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(mappeKnapp);
    expect(mappeKnapp.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(mappeKnapp);
    expect(mappeKnapp.getAttribute("aria-expanded")).toBe("false");
  });

  it("har riktig ARIA-trestruktur", () => {
    render(<SakFilområde filer={mockFiler} />);
    const tre = screen.getByRole("tree");
    expect(tre).toBeDefined();

    const treElementer = screen.getAllByRole("treeitem");
    expect(treElementer.length).toBe(2);

    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;
    expect(mappeKnapp.getAttribute("aria-level")).toBe("1");
  });

  it("viser group-rolle for barn i ekspandert mappe", () => {
    render(<SakFilområde filer={mockFiler} />);
    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;
    fireEvent.click(mappeKnapp);

    const grupper = screen.getAllByRole("group");
    expect(grupper.length).toBe(1);

    const barnElement = screen.getByText("Rapport.pdf").closest("a") as HTMLAnchorElement;
    expect(barnElement.getAttribute("aria-level")).toBe("2");
  });

  it("åpner mappe med Enter-tasten", () => {
    render(<SakFilområde filer={mockFiler} />);
    const tre = screen.getByRole("tree");

    fireEvent.keyDown(tre, { key: "Enter" });
    expect(screen.getByText("Rapport.pdf")).toBeDefined();
  });

  it("toggler mappe med mellomromstasten", () => {
    render(<SakFilområde filer={mockFiler} />);
    const tre = screen.getByRole("tree");

    fireEvent.keyDown(tre, { key: " " });
    expect(screen.getByText("Rapport.pdf")).toBeDefined();

    fireEvent.keyDown(tre, { key: " " });
    expect(screen.queryByText("Rapport.pdf")).toBeNull();
  });

  it("har riktige lenkeattributter for filer", () => {
    render(<SakFilområde filer={mockFiler} />);
    const filLenke = screen.getByText("Notat.docx").closest("a") as HTMLAnchorElement;

    expect(filLenke.getAttribute("href")).toBe("https://example.com/notat.docx");
    expect(filLenke.getAttribute("target")).toBe("_blank");
    expect(filLenke.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
