import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { DokumentTre } from "./DokumentTre";
import { SakFilområde } from "./SakFilområde";
import type { DokumentNode, FilResponse } from "./typer";

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

const mockFiler: FilResponse[] = [
  {
    id: "fil-1",
    filnavn: "rapport.pdf",
    storrelse: 204800,
    contentType: "application/pdf",
    opprettetAv: "Ola Nordmann",
    opprettet: "2026-02-15T10:30:00Z",
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
  it("viser heading 'Dokumenter' alltid", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });
    expect(screen.getByText("Dokumenter")).toBeDefined();
  });

  it("viser heading 'Vedlegg' alltid", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });
    expect(screen.getByText("Vedlegg")).toBeDefined();
  });

  it("viser dokumenter i listen", () => {
    renderOmråde({ dokumenter: mockDokumenter, filer: [], sakId: "ABC-123" });
    expect(screen.getByText("Rapport")).toBeDefined();
    expect(screen.getByText("Notat")).toBeDefined();
  });

  it("viser opplastede filer", () => {
    renderOmråde({ dokumenter: [], filer: mockFiler, sakId: "ABC-123" });
    expect(screen.getByText("rapport.pdf")).toBeDefined();
  });

  it("viser 'Opprett dokument'-knapp når redigerbar er true", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });
    expect(screen.getByText("Opprett dokument")).toBeDefined();
  });

  it("skjuler 'Opprett dokument'-knapp når redigerbar er false", () => {
    renderOmråde({ dokumenter: mockDokumenter, filer: [], sakId: "ABC-123", redigerbar: false });
    expect(screen.queryByText("Opprett dokument")).toBeNull();
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
