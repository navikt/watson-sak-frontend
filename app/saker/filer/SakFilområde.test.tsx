import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { RouteConfig } from "~/routeConfig";
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
    bruktIDokumenter: [],
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

/** Rendrer med en fungerende action-route, slik at vi kan verifisere hva skjemaet faktisk sender inn. */
function renderOmrådeMedAction(
  props: Parameters<typeof SakFilområde>[0],
  action: (formData: FormData) => unknown,
) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => <SakFilområde {...props} />,
    },
    {
      path: RouteConfig.API.SAK_DOKUMENTER,
      action: async ({ request }) => action(await request.formData()),
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

  it("viser 'Tomt dokument' og alle maler i handlingsmenyen", async () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });

    fireEvent.click(screen.getByText("Opprett dokument"));

    expect(await screen.findByText("Tomt dokument")).toBeDefined();
    expect(screen.getByText("Kontrollrapport - Arbeid")).toBeDefined();
    expect(screen.getByText("Kontrollrapport - Enslig forsørger")).toBeDefined();
    expect(screen.getByText("Kontrollrapport - Utland")).toBeDefined();
  });

  it("sender ingen malId når 'Tomt dokument' velges", async () => {
    const mottatt: FormData[] = [];
    renderOmrådeMedAction({ dokumenter: [], filer: [], sakId: "ABC-123" }, (formData) => {
      mottatt.push(formData);
      return null;
    });

    fireEvent.click(screen.getByText("Opprett dokument"));
    fireEvent.click(await screen.findByText("Tomt dokument"));

    await waitFor(() => expect(mottatt).toHaveLength(1));
    expect(mottatt[0].get("malId")).toBeNull();
  });

  it("sender malId og erStraffesak når en mal velges", async () => {
    const mottatt: FormData[] = [];
    renderOmrådeMedAction({ dokumenter: [], filer: [], sakId: "ABC-123" }, (formData) => {
      mottatt.push(formData);
      return null;
    });

    fireEvent.click(screen.getByText("Opprett dokument"));
    fireEvent.click(await screen.findByText("Kontrollrapport - Arbeid"));
    fireEvent.click(await screen.findByText("Straffesak"));

    await waitFor(() => expect(mottatt).toHaveLength(1));
    expect(mottatt[0].get("malId")).toBe("arbeid");
    expect(mottatt[0].get("erStraffesak")).toBe("true");
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

  describe("tilgang via koblet sak (kun les)", () => {
    it("viser filer", () => {
      renderOmråde({ dokumenter: [], filer: mockFiler, sakId: "ABC-123", redigerbar: false });
      expect(screen.getByText("rapport.pdf")).toBeDefined();
    });

    it("skjuler 'Opprett dokument'-knapp", () => {
      renderOmråde({ dokumenter: [], filer: mockFiler, sakId: "ABC-123", redigerbar: false });
      expect(screen.queryByText("Opprett dokument")).toBeNull();
    });

    it("skjuler 'Last opp vedlegg'-knapp", () => {
      renderOmråde({ dokumenter: [], filer: mockFiler, sakId: "ABC-123", redigerbar: false });
      expect(screen.queryByText("Last opp vedlegg")).toBeNull();
    });

    it("skjuler slett-knapp per fil", () => {
      renderOmråde({
        dokumenter: [],
        filer: mockFiler,
        sakId: "ABC-123",
        redigerbar: false,
        erSakseier: false,
      });
      expect(screen.queryByRole("button", { name: `Slett ${mockFiler[0].filnavn}` })).toBeNull();
    });
  });
});
