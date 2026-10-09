import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RouteConfig } from "~/routeConfig";
import { DokumentTre } from "./DokumentTre";
import { SakFilområde } from "./SakFilområde";
import type { DokumentNode, FilResponse } from "./typer";

const mockDokumenter: DokumentNode[] = [
  {
    id: "1",
    tittel: "Rapport",
    opprettetAv: "Ola Nordmann",
    opprettetDato: "2026-02-10",
    endretAv: "Ola Nordmann",
    endretDato: "2026-02-15",
    låsAv: null,
  },
  {
    id: "2",
    tittel: "Notat",
    opprettetAv: "Kari Hansen",
    opprettetDato: "2026-02-25",
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

function renderTre(
  props: Parameters<typeof DokumentTre>[0],
  mappehandling?: (request: Request) => unknown,
) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => <DokumentTre {...props} />,
    },
    ...(mappehandling
      ? [
          {
            path: RouteConfig.API.SAK_MAPPER,
            action: async ({ request }: { request: Request }) => mappehandling(request),
          },
        ]
      : []),
  ]);
  return render(<Stub initialEntries={["/saker/ABC-123"]} />);
}

describe("SakFilområde", () => {
  it("viser heading 'Filer' alltid", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });
    expect(screen.getByRole("heading", { name: "Filer" })).toBeDefined();
  });

  it("viser caption 'Mapper' og knapp for å opprette mappe", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });
    expect(screen.getByRole("heading", { name: "Mapper" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett mappe" })).toBeDefined();
  });

  it("oppretter en undermappe i valgt mappe", async () => {
    const mottatt: unknown[] = [];
    const Stub = createRoutesStub([
      {
        path: "/saker/:sakId",
        Component: () => (
          <SakFilområde dokumenter={[]} filer={[]} mapper={["Bank"]} sakId="ABC-123" />
        ),
      },
      {
        path: "/api/saker/:sakId/mapper",
        action: async ({ request }) => {
          mottatt.push(await request.json());
          return { ok: true };
        },
      },
    ]);
    render(<Stub initialEntries={["/saker/ABC-123"]} />);

    fireEvent.click(await screen.findByRole("button", { name: "Opprett mappe" }));
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Opprett mappe" })).toBeDefined();
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Mappenavn" }), {
      target: { value: " Kontoutskrifter " },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Plassering" }), {
      target: { value: "Bank" },
    });
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Opprett mappe" }),
    );

    await waitFor(() => {
      expect(mottatt).toEqual([{ handling: "opprett", sti: "Bank/Kontoutskrifter" }]);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("viser 'Opprett mappe' når brukeren kan laste opp filer, men ikke redigere dokumenter", () => {
    renderOmråde({
      dokumenter: [],
      filer: [],
      sakId: "ABC-123",
      redigerbar: false,
      kanLasteOppFiler: true,
    });
    expect(screen.getByRole("button", { name: "Opprett mappe" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Opprett dokument" })).toBeNull();
  });

  it("skjuler 'Opprett mappe' når brukeren ikke kan redigere", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123", redigerbar: false });
    expect(screen.queryByRole("button", { name: "Opprett mappe" })).toBeNull();
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

  it("viser 'Last opp fil'-knapp når redigerbar er true", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });
    expect(screen.getByText("Last opp fil")).toBeDefined();
  });

  it("viser tomtilstand når det ikke er noen dokumenter eller filer", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });
    expect(screen.getByText("Ingen dokumenter eller filer ennå")).toBeDefined();
  });

  it("skjuler 'Opprett dokument'- og 'Last opp fil'-knapp når redigerbar er false", () => {
    renderOmråde({ dokumenter: mockDokumenter, filer: [], sakId: "ABC-123", redigerbar: false });
    expect(screen.queryByText("Opprett dokument")).toBeNull();
    expect(screen.queryByText("Last opp fil")).toBeNull();
  });

  it("tillater filopplasting uten å tillate opprettelse eller endring av dokumenter", () => {
    renderOmråde({
      dokumenter: mockDokumenter,
      filer: [],
      sakId: "ABC-123",
      redigerbar: false,
      kanLasteOppFiler: true,
    });

    expect(screen.queryByText("Opprett dokument")).toBeNull();
    expect(screen.getByText("Last opp fil")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Handlinger for Rapport" }));
    expect(screen.queryByRole("menuitem", { name: "Slett" })).toBeNull();
  });

  it("viser modal med tomt dokument og alle malvalg", async () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123" });

    fireEvent.click(screen.getByText("Opprett dokument"));

    expect(await screen.findByRole("heading", { name: "Opprett dokument" })).toBeDefined();
    expect(screen.getByText("Blankt dokument")).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Kontrollrapport – Arbeid Ikke straffesak" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Kontrollrapport – Arbeid Straffesak" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", {
        name: "Kontrollrapport – Enslig forsørger Ikke straffesak",
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Kontrollrapport – Enslig forsørger Straffesak" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Kontrollrapport – Utland Ikke straffesak" }),
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Kontrollrapport – Utland Straffesak" }),
    ).toBeDefined();
    expect(screen.getAllByRole("button", { name: /^Innhentingsbrev/ })).toHaveLength(1);
    expect(screen.getByText("Hente inn opplysninger fra eksterne parter")).toBeDefined();
  });

  it("sender innhentingsbrev som malId uten straffesak-variant", async () => {
    const mottatt: FormData[] = [];
    renderOmrådeMedAction({ dokumenter: [], filer: [], sakId: "ABC-123" }, (formData) => {
      mottatt.push(formData);
      return null;
    });

    fireEvent.click(screen.getByText("Opprett dokument"));
    fireEvent.click(await screen.findByRole("button", { name: "Innhentingsbrev" }));

    await waitFor(() => expect(mottatt).toHaveLength(1));
    expect(mottatt[0].get("malId")).toBe("innhentingsbrev");
  });

  it("sender ingen malId når 'Blankt dokument' velges", async () => {
    const mottatt: FormData[] = [];
    renderOmrådeMedAction({ dokumenter: [], filer: [], sakId: "ABC-123" }, (formData) => {
      mottatt.push(formData);
      return null;
    });

    fireEvent.click(screen.getByText("Opprett dokument"));
    fireEvent.click(await screen.findByText("Blankt dokument"));

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
    fireEvent.click(
      await screen.findByRole("button", { name: "Kontrollrapport – Arbeid Straffesak" }),
    );

    await waitFor(() => expect(mottatt).toHaveLength(1));
    expect(mottatt[0].get("malId")).toBe("arbeid");
    expect(mottatt[0].get("erStraffesak")).toBe("true");
  });

  it("viser spinner og deaktiverer avbryt mens dokumentet opprettes", async () => {
    let fullførOpprettelse!: () => void;
    const opprettelse = new Promise<void>((resolve) => {
      fullførOpprettelse = resolve;
    });

    renderOmrådeMedAction({ dokumenter: [], filer: [], sakId: "ABC-123" }, async () => opprettelse);

    fireEvent.click(screen.getByText("Opprett dokument"));
    fireEvent.click(await screen.findByText("Blankt dokument"));

    expect(await screen.findByTitle("Oppretter dokument")).toBeDefined();
    expect((screen.getByRole("button", { name: "Avbryt" }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    fullførOpprettelse();
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

  it("flytter arkiverte filer til Arkivert-seksjonen, ikke mappetreet", () => {
    const arkivertFil: FilResponse = {
      ...mockFiler[0],
      id: "fil-arkivert",
      filnavn: "arkivert.pdf",
      arkivert: "2026-03-01T10:00:00Z",
      arkivertAv: "Z999999",
    };

    renderOmråde({ dokumenter: [], filer: [...mockFiler, arkivertFil], sakId: "ABC-123" });

    expect(screen.getByRole("heading", { name: "Arkivert" })).toBeDefined();

    const opplastedeFiler = screen.getByRole("list", { name: "Dokumenter og filer" });
    const arkivertListe = screen.getByRole("list", { name: "Arkivert" });

    expect(within(opplastedeFiler).getByText("rapport.pdf")).toBeDefined();
    expect(within(opplastedeFiler).queryByText("arkivert.pdf")).toBeNull();

    expect(within(arkivertListe).getByText("arkivert.pdf")).toBeDefined();
    expect(within(arkivertListe).queryByText("rapport.pdf")).toBeNull();
  });

  it("viser ikke Arkivert-seksjonen når ingen filer eller dokumenter er arkivert", () => {
    renderOmråde({ dokumenter: [], filer: mockFiler, sakId: "ABC-123" });
    expect(screen.queryByRole("heading", { name: "Arkivert" })).toBeNull();
  });

  it("viser arkiverte dokumenter kun i Arkivert-seksjonen, ikke i mappetreet", () => {
    const arkivertDokument: DokumentNode = {
      ...mockDokumenter[0],
      id: "3",
      tittel: "Arkivert dokument",
      arkivert: "2026-03-01T10:00:00Z",
      arkivertAv: "Z999999",
    };

    renderOmråde({
      dokumenter: [...mockDokumenter, arkivertDokument],
      filer: [],
      sakId: "ABC-123",
    });

    const redigerbareDokumenter = screen.getByRole("list", { name: "Dokumenter og filer" });
    const arkivertListe = screen.getByRole("list", { name: "Arkivert" });

    expect(within(redigerbareDokumenter).queryByText("Arkivert dokument")).toBeNull();
    expect(within(arkivertListe).getByText("Arkivert dokument")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Handlinger for Arkivert dokument" })).toBeNull();
  });

  it("skjuler et arkivert dokument fra Arkivert-seksjonen når det allerede har en arkivert fil", () => {
    const arkivertDokument: DokumentNode = {
      ...mockDokumenter[0],
      id: "3",
      tittel: "Arkivert dokument",
      arkivert: "2026-03-01T10:00:00Z",
      arkivertAv: "Z999999",
    };
    const arkivertFilFraDokument: FilResponse = {
      ...mockFiler[0],
      id: "fil-fra-dokument",
      filnavn: "Arkivert dokument.pdf",
      arkivert: "2026-03-01T10:00:00Z",
      arkivertAv: "Z999999",
      arkivertFraDokumentId: "3",
    };

    renderOmråde({
      dokumenter: [...mockDokumenter, arkivertDokument],
      filer: [arkivertFilFraDokument],
      sakId: "ABC-123",
    });

    const arkivertListe = screen.getByRole("list", { name: "Arkivert" });

    // Bare PDF-en (filen) skal vises, ikke også en duplikatrad for kildedokumentet
    expect(within(arkivertListe).getByText("Arkivert dokument.pdf")).toBeDefined();
    expect(within(arkivertListe).queryByText("Arkivert dokument")).toBeNull();
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

    it("skjuler 'Last opp fil'-knapp", () => {
      renderOmråde({ dokumenter: [], filer: mockFiler, sakId: "ABC-123", redigerbar: false });
      expect(screen.queryByText("Last opp fil")).toBeNull();
    });

    it("skjuler handlingsmenyen per fil", () => {
      renderOmråde({
        dokumenter: [],
        filer: mockFiler,
        sakId: "ABC-123",
        redigerbar: false,
        erSakseier: false,
      });
      expect(
        screen.queryByRole("button", { name: `Handlinger for ${mockFiler[0].filnavn}` }),
      ).toBeNull();
    });
  });
});

describe("Arkivert", () => {
  const journalposter = [
    {
      journalpostId: "453912345",
      journalposttype: "NOTAT",
      tittel: "Notat om kontroll",
      opprettet: "2026-03-01T10:00:00Z",
    },
  ];

  it("grupperer arkiverte filer under journalposten de tilhører, med type som tag", () => {
    const vedlegg: FilResponse = {
      ...mockFiler[0],
      id: "fil-arkivert",
      filnavn: "kontoutskrift.pdf",
      arkivert: "2026-03-01T10:00:00Z",
      arkivertAv: "Z999999",
      arkivertJournalpostId: "453912345",
    };
    const ukjent: FilResponse = {
      ...vedlegg,
      id: "fil-ukjent",
      filnavn: "gammel.pdf",
      arkivertJournalpostId: "999",
    };

    renderOmråde({ dokumenter: [], filer: [vedlegg, ukjent], journalposter, sakId: "ABC-123" });

    expect(screen.getByText("Journalført i dokumentarkiv – koblet til journalpost")).toBeDefined();
    const kort = screen.getByRole("list", { name: "Vedlegg i Notat om kontroll" });
    expect(within(kort).getByText("kontoutskrift.pdf")).toBeDefined();
    expect(within(kort).getByText(/Vedlegg · PDF ·/)).toBeDefined();
    expect(screen.getByText("Notat")).toBeDefined();
    expect(screen.getByText(/Journalpost 453912345 · Arkivert .* · 1 vedlegg/)).toBeDefined();

    const reserve = screen.getByRole("list", { name: "Vedlegg i Journalpost 999" });
    expect(within(reserve).getByText("gammel.pdf")).toBeDefined();
  });

  it("viser journalposter også når de ikke har arkiverte vedlegg", () => {
    renderOmråde({ dokumenter: [], filer: [], journalposter, sakId: "ABC-123" });
    expect(screen.getByText("Notat om kontroll")).toBeDefined();
    expect(screen.getByText(/0 vedlegg/)).toBeDefined();
  });
});

describe("DokumentTre med mapper", () => {
  const dokumenter: DokumentNode[] = [
    { ...mockDokumenter[0], mappe: "Bank/Utskrifter" },
    { ...mockDokumenter[1], mappe: "Møter" },
    {
      ...mockDokumenter[1],
      id: "3",
      tittel: "Arkivert notat",
      mappe: "Bank",
      arkivert: "2026-03-02T10:00:00Z",
    },
  ];
  const mapper = ["Bank", "Bank/Utskrifter", "Møter"];

  it("legger dokumenter i lukkede mapper når ingen er åpnet", () => {
    renderTre({ noder: dokumenter, mapper, sakId: "ABC-123" });

    expect(screen.getByRole("button", { name: /Bank/ }).getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(screen.queryByText("Rapport")).toBeNull();
    expect(screen.queryByText("Notat")).toBeNull();
  });

  it("åpner alle mappene over dokumentet som er åpent", () => {
    renderTre({ noder: dokumenter, mapper, sakId: "ABC-123", fremhevetId: "1" });

    expect(screen.getByRole("button", { name: /Bank/ }).getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("button", { name: /Utskrifter/ }).getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: /Møter/ }).getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(screen.getByText("Rapport")).toBeDefined();
  });

  it("åpner ikke den gamle mappen til et arkivert dokument som er åpent", () => {
    renderTre({ noder: dokumenter, mapper, sakId: "ABC-123", fremhevetId: "3" });

    expect(screen.getByRole("button", { name: /Bank/ }).getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(screen.getByText("Arkivert notat")).toBeDefined();
  });

  it("viser arkiverte dokumenter på rotnivå, ikke i mappen de lå i", () => {
    renderTre({ noder: dokumenter, mapper, sakId: "ABC-123" });

    const rot = screen.getByRole("list", { name: "Dokumenter" });
    const rotElementer = within(rot).getAllByRole("listitem", { hidden: false });
    expect(rotElementer.at(-1)?.textContent).toContain("Arkivert notat");
    expect(screen.getByRole("button", { name: /Bank/ }).getAttribute("aria-expanded")).toBe(
      "false",
    );
  });

  it("flytter dokument til mappe med dra og slipp", async () => {
    const handlinger: unknown[] = [];
    renderTre(
      { noder: dokumenter, mapper, sakId: "ABC-123", kanEndreMapper: true, fremhevetId: "1" },
      async (request) => {
        handlinger.push(await request.json());
        return { ok: true };
      },
    );

    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
    const dokument = screen.getByText("Rapport").closest("li");
    const mål = screen.getByRole("button", { name: /^Møter/ }).closest("li");
    if (!dokument || !mål) throw new Error("Fant ikke elementene");

    fireEvent.dragStart(dokument, { dataTransfer });
    fireEvent.dragOver(mål, { dataTransfer });
    fireEvent.drop(mål, { dataTransfer });

    await waitFor(() => {
      expect(handlinger).toEqual([{ handling: "flytt-dokument", id: "1", mappe: "Møter" }]);
    });
  });

  it("lar ikke en mappe slippes i sin egen undermappe", () => {
    const handling = vi.fn();
    renderTre({ noder: dokumenter, mapper, sakId: "ABC-123", kanEndreMapper: true }, handling);
    fireEvent.click(screen.getByRole("button", { name: /^Bank/ }));

    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
    const bank = screen.getByRole("button", { name: /^Bank/ }).closest("li");
    const under = screen.getByRole("button", { name: /^Utskrifter/ }).closest("li");
    if (!bank || !under) throw new Error("Fant ikke elementene");

    fireEvent.dragStart(bank, { dataTransfer });
    fireEvent.dragOver(under, { dataTransfer });
    fireEvent.drop(under, { dataTransfer });

    expect(handling).not.toHaveBeenCalled();
  });

  it("har ingen draggable-elementer uten tilgang til å endre mapper", () => {
    renderTre({ noder: dokumenter, mapper, sakId: "ABC-123" });

    expect(document.querySelectorAll("[draggable='true']")).toHaveLength(0);
  });

  it("gjør ikke arkiverte dokumenter draggable", () => {
    renderTre({ noder: dokumenter, mapper, sakId: "ABC-123", kanEndreMapper: true });

    expect(screen.getByText("Arkivert notat").closest("li")?.getAttribute("draggable")).toBeNull();
  });
});
