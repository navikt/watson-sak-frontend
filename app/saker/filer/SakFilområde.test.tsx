import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { DokumentTre } from "./DokumentTre";
import { SakFilområde } from "./SakFilområde";
import type { DokumentNode } from "./typer";

const mockDokumenter: DokumentNode[] = [
  {
    id: "1",
    tittel: "Rapport",
    endretAv: "Ola Nordmann",
    endretDato: "2026-02-15",
    låsAv: null,
  },
  {
    id: "2",
    tittel: "Notat",
    endretAv: "Kari Hansen",
    endretDato: "2026-03-01",
    låsAv: null,
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

  it("viser heading 'Dokumenter' alltid", () => {
    renderOmråde({ dokumenter: [], sakId: "ABC-123" });
    expect(screen.getByText("Dokumenter")).toBeDefined();
  });

  it("viser dokumenter i listen", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    expect(screen.getByText("Rapport")).toBeDefined();
    expect(screen.getByText("Notat")).toBeDefined();
  });

  it("viser handlingsknapper når det finnes dokumenter og man kan redigere", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123" });
    expect(screen.getByText("Opprett dokument")).toBeDefined();
    expect(screen.getByText("Last opp fil")).toBeDefined();
  });

  it("skjuler handlingsknapper når redigerbar er false", () => {
    renderOmråde({ dokumenter: mockDokumenter, sakId: "ABC-123", redigerbar: false });
    expect(screen.queryByText("Opprett dokument")).toBeNull();
    expect(screen.queryByText("Last opp fil")).toBeNull();
  });

  it("lenker dokumenter internt til editoren", () => {
    renderTre({ noder: mockDokumenter, sakId: "ABC-123", fremhevetId: "2" });
    const lenke = screen.getByText("Notat").closest("a") as HTMLAnchorElement;

    expect(lenke.getAttribute("href")).toBe("/saker/ABC-123/dokumenter/2");
    expect(lenke.getAttribute("aria-current")).toBe("page");
  });

  it("viser handlingsmeny per dokument", () => {
    renderTre({ noder: mockDokumenter, sakId: "ABC-123" });

    expect(screen.getByRole("button", { name: "Handlinger for Notat" })).toBeDefined();
  });
});
