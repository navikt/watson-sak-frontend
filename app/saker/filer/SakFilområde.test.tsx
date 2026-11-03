import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
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
  dokumentSletting?: (request: Request) => unknown,
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
    ...(dokumentSletting
      ? [
          {
            path: RouteConfig.API.SAK_DOKUMENTER,
            action: async ({ request }: { request: Request }) => dokumentSletting(request),
          },
        ]
      : []),
  ]);
  return render(<Stub initialEntries={["/saker/ABC-123"]} />);
}

describe("SakFilområde", () => {
  it("viser heading 'Filer' alltid", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" });
    expect(screen.getByRole("heading", { name: "Filer" })).toBeDefined();
  });

  it("viser caption 'Mapper' og knapp for å opprette mappe", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" });
    expect(screen.getByRole("heading", { name: "Mapper" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett mappe" })).toBeDefined();
  });

  it("oppretter en undermappe i valgt mappe", async () => {
    const mottatt: unknown[] = [];
    const Stub = createRoutesStub([
      {
        path: "/saker/:sakId",
        Component: () => (
          <SakFilområde
            steg="UTREDNING"
            dokumenter={[]}
            filer={[]}
            mapper={["Bank"]}
            sakId="ABC-123"
          />
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
      steg: "UTREDNING",
      redigerbar: false,
      kanLasteOppFiler: true,
    });
    expect(screen.getByRole("button", { name: "Opprett mappe" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Opprett dokument" })).toBeNull();
  });

  it("skjuler 'Opprett mappe' når brukeren ikke kan redigere", () => {
    renderOmråde({
      dokumenter: [],
      filer: [],
      sakId: "ABC-123",
      steg: "UTREDNING",
      redigerbar: false,
    });
    expect(screen.queryByRole("button", { name: "Opprett mappe" })).toBeNull();
  });

  it("viser dokumenter i listen", () => {
    renderOmråde({ dokumenter: mockDokumenter, filer: [], sakId: "ABC-123", steg: "UTREDNING" });
    expect(screen.getByText("Rapport")).toBeDefined();
    expect(screen.getByText("Notat")).toBeDefined();
  });

  it("viser opplastede filer", () => {
    renderOmråde({ dokumenter: [], filer: mockFiler, sakId: "ABC-123", steg: "UTREDNING" });
    expect(screen.getByText("rapport.pdf")).toBeDefined();
  });

  it("viser 'Opprett dokument'-knapp når redigerbar er true", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" });
    expect(screen.getByText("Opprett dokument")).toBeDefined();
  });

  it("viser 'Last opp fil'-knapp når redigerbar er true", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" });
    expect(screen.getByText("Last opp fil")).toBeDefined();
  });

  it("viser tomtilstand når det ikke er noen dokumenter eller filer", () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" });
    expect(screen.getByText("Ingen dokumenter eller filer ennå")).toBeDefined();
  });

  it("skjuler 'Opprett dokument'- og 'Last opp fil'-knapp når redigerbar er false", () => {
    renderOmråde({
      dokumenter: mockDokumenter,
      filer: [],
      sakId: "ABC-123",
      steg: "UTREDNING",
      redigerbar: false,
    });
    expect(screen.queryByText("Opprett dokument")).toBeNull();
    expect(screen.queryByText("Last opp fil")).toBeNull();
  });

  it("tillater filopplasting uten å tillate opprettelse eller endring av dokumenter", () => {
    renderOmråde({
      dokumenter: mockDokumenter,
      filer: [],
      sakId: "ABC-123",
      steg: "UTREDNING",
      redigerbar: false,
      kanLasteOppFiler: true,
    });

    expect(screen.queryByText("Opprett dokument")).toBeNull();
    expect(screen.getByText("Last opp fil")).toBeDefined();
    // Dokumenter kan verken slettes eller flyttes uten endretilgang, så de har ingen meny.
    expect(screen.queryByRole("button", { name: "Handlinger for Rapport" })).toBeNull();
  });

  it("viser modal med tomt dokument og alle malvalg", async () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" });

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

  it("viser ikke anmeldelse under utredning", async () => {
    renderOmråde({ dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" });

    fireEvent.click(screen.getByText("Opprett dokument"));

    await screen.findByRole("button", { name: "Innhentingsbrev" });
    expect(screen.queryByRole("button", { name: "Anmeldelse" })).toBeNull();
  });

  it("viser anmeldelse, men ingen kontrollrapporter, i strafferettslig vurdering", async () => {
    renderOmråde({
      dokumenter: [],
      filer: [],
      sakId: "ABC-123",
      steg: "STRAFFERETTSLIG_VURDERING",
    });

    fireEvent.click(screen.getByText("Opprett dokument"));

    expect(await screen.findByRole("button", { name: "Anmeldelse" })).toBeDefined();
    expect(screen.queryByText("Rapportmaler")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Kontrollrapport/ })).toBeNull();
  });

  it("sender innhentingsbrev som malId uten straffesak-variant", async () => {
    const mottatt: FormData[] = [];
    renderOmrådeMedAction(
      { dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" },
      (formData) => {
        mottatt.push(formData);
        return null;
      },
    );

    fireEvent.click(screen.getByText("Opprett dokument"));
    fireEvent.click(await screen.findByRole("button", { name: "Innhentingsbrev" }));

    await waitFor(() => expect(mottatt).toHaveLength(1));
    expect(mottatt[0].get("malId")).toBe("innhentingsbrev");
  });

  it("sender ingen malId når 'Blankt dokument' velges", async () => {
    const mottatt: FormData[] = [];
    renderOmrådeMedAction(
      { dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" },
      (formData) => {
        mottatt.push(formData);
        return null;
      },
    );

    fireEvent.click(screen.getByText("Opprett dokument"));
    fireEvent.click(await screen.findByText("Blankt dokument"));

    await waitFor(() => expect(mottatt).toHaveLength(1));
    expect(mottatt[0].get("malId")).toBeNull();
  });

  it("viser teknisk feil med feil-ID i dialogen når opprettelse feiler", async () => {
    renderOmrådeMedAction({ dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" }, () =>
      data(
        { ok: false, teknisk: true, usikker: false, feilId: "feil-opprett-123" },
        { status: 500 },
      ),
    );

    fireEvent.click(screen.getByText("Opprett dokument"));
    fireEvent.click(await screen.findByText("Blankt dokument"));

    expect(await screen.findByText("Vi fikk ikke opprettet dokumentet")).toBeDefined();
    expect(screen.getByText("feil-opprett-123")).toBeDefined();
    expect(screen.getByText("Prøv igjen om litt.")).toBeDefined();
  });

  it("sender malId og erStraffesak når en mal velges", async () => {
    const mottatt: FormData[] = [];
    renderOmrådeMedAction(
      { dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" },
      (formData) => {
        mottatt.push(formData);
        return null;
      },
    );

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

    renderOmrådeMedAction(
      { dokumenter: [], filer: [], sakId: "ABC-123", steg: "UTREDNING" },
      async () => opprettelse,
    );

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

  it("flytter dokument til mappe via flyttedialogen", async () => {
    const handlinger: unknown[] = [];
    renderTre(
      {
        noder: mockDokumenter,
        mapper: ["Bank"],
        sakId: "ABC-123",
        kanEndreMapper: true,
        kanFlytteDokumenter: true,
      },
      async (request) => {
        handlinger.push(await request.json());
        return { ok: true };
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Handlinger for Rapport" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Flytt til …" }));
    expect(await screen.findByRole("dialog", { name: "Flytt «Rapport»" })).toBeDefined();
    fireEvent.change(screen.getByRole("combobox", { name: "Flytt til" }), {
      target: { value: "Bank" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Flytt" }));

    await waitFor(() => {
      expect(handlinger).toEqual([{ handling: "flytt-dokument", id: "1", mappe: "Bank" }]);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("flytter mappe fra menyen", async () => {
    const handlinger: unknown[] = [];
    renderTre(
      {
        noder: mockDokumenter,
        mapper: ["Bank", "Møter"],
        sakId: "ABC-123",
        kanEndreMapper: true,
      },
      async (request) => {
        handlinger.push(await request.json());
        return { ok: true };
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Handlinger for mappen Bank" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Flytt til …" }));
    expect(await screen.findByRole("dialog", { name: "Flytt «Bank»" })).toBeDefined();
    fireEvent.change(screen.getByRole("combobox", { name: "Flytt til" }), {
      target: { value: "Møter" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Flytt" }));

    await waitFor(() => {
      expect(handlinger).toEqual([{ handling: "endre", fraSti: "Bank", tilSti: "Møter/Bank" }]);
    });
  });

  it("viser ikke flyttevalg når brukeren ikke kan endre mapper", () => {
    renderTre({ noder: mockDokumenter, mapper: ["Bank"], sakId: "ABC-123" });

    fireEvent.click(screen.getByRole("button", { name: "Handlinger for Rapport" }));
    expect(screen.queryByRole("menuitem", { name: "Flytt til …" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Handlinger for mappen Bank" })).toBeNull();
  });

  it("viser feilmelding når mappehandlingen feiler", async () => {
    renderTre(
      {
        noder: mockDokumenter,
        mapper: ["Bank"],
        sakId: "ABC-123",
        kanEndreMapper: true,
        kanFlytteDokumenter: true,
      },
      async () => ({ ok: false, melding: "Kunne ikke flytte elementet" }),
    );

    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
    const dokument = screen.getByText("Rapport").closest("li");
    const mål = screen.getByRole("button", { name: /^Bank/ }).closest("li");
    if (!dokument || !mål) throw new Error("Fant ikke elementene");
    fireEvent.dragStart(dokument, { dataTransfer });
    fireEvent.dragOver(mål, { dataTransfer });
    fireEvent.drop(mål, { dataTransfer });

    expect(await screen.findByText("Kunne ikke flytte elementet")).toBeDefined();
  });

  it("viser ikke arkiverte filer og dokumenter i filområdet, siden de ligger i Gosys", () => {
    const arkivertFil: FilResponse = {
      ...mockFiler[0],
      id: "fil-arkivert",
      filnavn: "arkivert.pdf",
      arkivert: "2026-03-01T10:00:00Z",
      arkivertAv: "Z999999",
    };
    const arkivertDokument: DokumentNode = {
      ...mockDokumenter[0],
      id: "3",
      tittel: "Arkivert dokument",
      arkivert: "2026-03-01T10:00:00Z",
      arkivertAv: "Z999999",
    };

    renderOmråde({
      dokumenter: [...mockDokumenter, arkivertDokument],
      filer: [...mockFiler, arkivertFil],
      sakId: "ABC-123",
      steg: "UTREDNING",
    });

    expect(screen.getByText("rapport.pdf")).toBeDefined();
    expect(screen.queryByText("arkivert.pdf")).toBeNull();
    expect(screen.queryByText("Arkivert dokument")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Arkivert" })).toBeNull();
  });

  describe("tilgang via koblet sak (kun les)", () => {
    it("viser filer", () => {
      renderOmråde({
        dokumenter: [],
        filer: mockFiler,
        sakId: "ABC-123",
        steg: "UTREDNING",
        redigerbar: false,
      });
      expect(screen.getByText("rapport.pdf")).toBeDefined();
    });

    it("skjuler 'Opprett dokument'-knapp", () => {
      renderOmråde({
        dokumenter: [],
        filer: mockFiler,
        sakId: "ABC-123",
        steg: "UTREDNING",
        redigerbar: false,
      });
      expect(screen.queryByText("Opprett dokument")).toBeNull();
    });

    it("skjuler 'Last opp fil'-knapp", () => {
      renderOmråde({
        dokumenter: [],
        filer: mockFiler,
        sakId: "ABC-123",
        steg: "UTREDNING",
        redigerbar: false,
      });
      expect(screen.queryByText("Last opp fil")).toBeNull();
    });

    it("skjuler handlingsmenyen per fil", () => {
      renderOmråde({
        dokumenter: [],
        filer: mockFiler,
        sakId: "ABC-123",
        steg: "UTREDNING",
        redigerbar: false,
        kanEndreFiler: false,
      });
      expect(
        screen.queryByRole("button", { name: `Handlinger for ${mockFiler[0].filnavn}` }),
      ).toBeNull();
    });
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
      {
        noder: dokumenter,
        mapper,
        sakId: "ABC-123",
        kanEndreMapper: true,
        kanFlytteDokumenter: true,
        fremhevetId: "1",
      },
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
    renderTre({
      noder: dokumenter,
      mapper,
      sakId: "ABC-123",
      kanEndreMapper: true,
      kanFlytteDokumenter: true,
    });

    expect(screen.getByText("Arkivert notat").closest("li")?.getAttribute("draggable")).toBeNull();
  });

  it("lar ikke dokumenter flyttes uten endretilgang, selv om mapper kan endres", () => {
    renderTre({ noder: dokumenter, mapper, sakId: "ABC-123", kanEndreMapper: true });

    const dokumentrader = screen.getAllByRole("link").map((lenke) => lenke.closest("li"));
    expect(dokumentrader.length).toBeGreaterThan(0);
    for (const rad of dokumentrader) {
      expect(rad?.getAttribute("draggable")).toBeNull();
    }
    expect(screen.getAllByRole("button", { name: /Handlinger for mappen/ }).length).toBeGreaterThan(
      0,
    );
  });

  it("beholder slettedialogen ved teknisk feil og lukker den først etter vellykket sletting", async () => {
    const slettSvar = vi
      .fn()
      .mockResolvedValueOnce(
        data(
          { ok: false, teknisk: true, usikker: false, feilId: "feil-slett-456" },
          { status: 500 },
        ),
      )
      .mockResolvedValueOnce({ ok: true });
    renderTre(
      { noder: [mockDokumenter[0]], sakId: "ABC-123", redigerbar: true },
      undefined,
      async () => slettSvar(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Handlinger for Rapport" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Slett" }));
    fireEvent.click(screen.getByRole("button", { name: "Slett dokument" }));

    expect(await screen.findByText("Vi fikk ikke slettet dokumentet")).toBeDefined();
    expect(screen.getByText("feil-slett-456")).toBeDefined();
    expect(screen.getByText("Prøv igjen om litt.")).toBeDefined();
    expect(screen.getByRole("dialog", { name: "Slette dokument?" })).toBeDefined();

    // Avbryt og åpne på nytt: den gamle feilen skal ikke vises før et nytt forsøk.
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    fireEvent.click(screen.getByRole("button", { name: "Handlinger for Rapport" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Slett" }));
    expect(await screen.findByRole("dialog", { name: "Slette dokument?" })).toBeDefined();
    expect(screen.queryByText("Vi fikk ikke slettet dokumentet")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Slett dokument" }));

    await waitFor(() => {
      expect(slettSvar).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("dialog", { name: "Slette dokument?" })).toBeNull();
    });
  });

  it("lar ikke kryss eller Escape lukke slettedialogen mens slettingen pågår", async () => {
    let svar: (verdi: unknown) => void = () => {};
    const slettSvar = vi.fn(() => new Promise((resolve) => (svar = resolve)));
    renderTre(
      { noder: [mockDokumenter[0]], sakId: "ABC-123", redigerbar: true },
      undefined,
      async () => slettSvar(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Handlinger for Rapport" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Slett" }));
    fireEvent.click(screen.getByRole("button", { name: "Slett dokument" }));
    await waitFor(() => expect(slettSvar).toHaveBeenCalled());

    const dialog = screen.getByRole("dialog", { name: "Slette dokument?" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    const lukk = screen.queryByRole("button", { name: "Lukk" });
    if (lukk) fireEvent.click(lukk);
    expect(screen.getByRole("dialog", { name: "Slette dokument?" })).toBeDefined();

    await act(async () => svar({ ok: true }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Slette dokument?" })).toBeNull(),
    );
  });
});
