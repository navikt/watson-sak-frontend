import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { DokumentTre } from "./DokumentTre";
import { SakFilområde } from "./SakFilområde";
import type { DokumentNode } from "./typer";

const mockDokumenter: DokumentNode[] = [
  {
    id: "1",
    type: "mappe",
    navn: "Dokumentasjon",
    barn: [
      {
        id: "1-1",
        type: "dokument",
        tittel: "Rapport",
        endretAv: "Ola Nordmann",
        endretDato: "2026-02-15",
      },
    ],
  },
  {
    id: "2",
    type: "dokument",
    tittel: "Notat",
    endretAv: "Kari Hansen",
    endretDato: "2026-03-01",
  },
];

function renderOmråde(props: Parameters<typeof SakFilområde>[0]) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => <SakFilområde {...props} />,
    },
  ]);
  return render(<Stub initialEntries={["/saker/ABC-123"]} />);
}

function renderTre(props: Parameters<typeof DokumentTre>[0]) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => <DokumentTre {...props} />,
    },
  ]);
  return render(<Stub initialEntries={["/saker/ABC-123"]} />);
}

describe("SakFilområde", () => {
  it("viser tomtilstand når det ikke er noen dokumenter", () => {
    renderOmråde({ dokumenter: [], sakId: "ABC-123" });
    expect(screen.getByText("Ingen dokumenter ennå")).toBeDefined();
    expect(screen.getByText("Last opp fil")).toBeDefined();
    expect(screen.getByText("Opprett dokument")).toBeDefined();
  });

  it("viser ikke lenger valg for å opprette mappe eller Office-filer", () => {
    renderOmråde({ dokumenter: [], sakId: "ABC-123" });
    expect(screen.queryByText("Opprett mappe")).toBeNull();
    expect(screen.queryByText("Opprett fil")).toBeNull();
  });

  it("skjuler knapper i tomtilstand når redigerbar er false", () => {
    renderOmråde({ dokumenter: [], sakId: "ABC-123", redigerbar: false });
    expect(screen.getByText("Ingen dokumenter ennå")).toBeDefined();
    expect(screen.queryByText("Last opp fil")).toBeNull();
    expect(screen.queryByText("Opprett dokument")).toBeNull();
  });

  it("viser heading 'Dokumenter' alltid", () => {
    renderOmråde({ dokumenter: [], sakId: "ABC-123" });
    expect(screen.getByText("Dokumenter")).toBeDefined();
  });

  it("viser dokumenter og mapper når det finnes data", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    expect(screen.getByText("Dokumentasjon")).toBeDefined();
    expect(screen.getByText("Notat")).toBeDefined();
  });

  it("viser handlingsknapper når det er dokumenter", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    expect(screen.getByText("Last opp fil")).toBeDefined();
    expect(screen.getByText("Opprett dokument")).toBeDefined();
  });

  it("skjuler handlingsknapper når redigerbar er false", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123", redigerbar: false });
    expect(screen.queryByText("Last opp fil")).toBeNull();
    expect(screen.queryByText("Opprett dokument")).toBeNull();
  });

  it("ekspanderer mappe ved klikk og viser barn", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    expect(screen.queryByText("Rapport")).toBeNull();

    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;
    fireEvent.click(mappeKnapp);

    expect(screen.getByText("Rapport")).toBeDefined();
  });

  it("kollapser mappe ved nytt klikk", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;

    fireEvent.click(mappeKnapp);
    expect(screen.getByText("Rapport")).toBeDefined();

    fireEvent.click(mappeKnapp);
    expect(screen.queryByText("Rapport")).toBeNull();
  });

  it("setter aria-expanded riktig ved toggle av mappe", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;

    expect(mappeKnapp.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(mappeKnapp);
    expect(mappeKnapp.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(mappeKnapp);
    expect(mappeKnapp.getAttribute("aria-expanded")).toBe("false");
  });

  it("har riktig ARIA-trestruktur", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    expect(screen.getByRole("tree")).toBeDefined();

    const treElementer = screen.getAllByRole("treeitem");
    expect(treElementer.length).toBe(2);

    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;
    expect(mappeKnapp.getAttribute("aria-level")).toBe("1");
  });

  it("viser group-rolle for barn i ekspandert mappe", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    const mappeKnapp = screen.getByText("Dokumentasjon").closest("button") as HTMLButtonElement;
    fireEvent.click(mappeKnapp);

    expect(screen.getAllByRole("group").length).toBe(1);

    const barnElement = screen.getByText("Rapport").closest("a") as HTMLAnchorElement;
    expect(barnElement.getAttribute("aria-level")).toBe("2");
  });

  it("åpner mappe med Enter-tasten", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    const tre = screen.getByRole("tree");

    fireEvent.keyDown(tre, { key: "Enter" });
    expect(screen.getByText("Rapport")).toBeDefined();
  });

  it("toggler mappe med mellomromstasten", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    const tre = screen.getByRole("tree");

    fireEvent.keyDown(tre, { key: " " });
    expect(screen.getByText("Rapport")).toBeDefined();

    fireEvent.keyDown(tre, { key: " " });
    expect(screen.queryByText("Rapport")).toBeNull();
  });

  it("lenker dokumenter internt til editoren (ikke ekstern SharePoint-lenke)", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    const dokumentLenke = screen.getByText("Notat").closest("a") as HTMLAnchorElement;

    expect(dokumentLenke.getAttribute("href")).toBe("/saker/ABC-123/dokumenter/2");
    expect(dokumentLenke.getAttribute("target")).toBeNull();
  });

  it("viser en handlingsmeny per dokument (ikke for mapper)", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });

    expect(screen.getByRole("button", { name: "Handlinger for Notat" })).toBeDefined();
    // Mappen «Dokumentasjon» skal ikke ha en handlingsmeny.
    expect(screen.queryByRole("button", { name: "Handlinger for Dokumentasjon" })).toBeNull();
  });

  it("holder handlingsmenyen utenfor tab-rekkefølgen for ufokuserte rader", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });

    // Første node (mappen) er fokusert som standard, så «Notat»-radens meny skal ikke
    // være tabbbar (roving tabindex).
    const meny = screen.getByRole("button", { name: "Handlinger for Notat" });
    expect(meny.getAttribute("tabindex")).toBe("-1");
  });

  it("fremhever dokumentet som er angitt med fremhevetId", () => {
    renderTre({ noder: mockDokumenter, sakId: "ABC-123", fremhevetId: "2" });

    const fremhevet = screen.getByText("Notat").closest("a") as HTMLAnchorElement;
    expect(fremhevet.getAttribute("aria-current")).toBe("page");
  });

  it("setter ikke aria-current når fremhevetId ikke er oppgitt", () => {
    renderTre({ noder: mockDokumenter, sakId: "ABC-123" });

    const lenke = screen.getByText("Notat").closest("a") as HTMLAnchorElement;
    expect(lenke.getAttribute("aria-current")).toBeNull();
  });
});
