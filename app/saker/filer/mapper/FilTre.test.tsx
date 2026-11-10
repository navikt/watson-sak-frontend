import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createRoutesStub, data } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DokumentNode, FilResponse } from "../typer";
import { FilTre } from "./FilTre";

const mockFiler: FilResponse[] = [
  {
    id: "fil-1",
    filnavn: "anmeldelse.pdf",
    storrelse: 204800,
    contentType: "application/pdf",
    opprettetAv: "Ola Nordmann",
    opprettet: "2026-02-15T10:30:00Z",
    bruktIDokumenter: [],
  },
  {
    id: "fil-2",
    filnavn: "screenshot.png",
    storrelse: 51200,
    contentType: "image/png",
    opprettetAv: "Kari Hansen",
    opprettet: "2026-03-01T14:00:00Z",
    bruktIDokumenter: [],
  },
];

const mockDokumenter: DokumentNode[] = [
  {
    id: "dok-1",
    tittel: "Saksframlegg",
    opprettetAv: "Ola Nordmann",
    opprettetDato: "2026-02-01T10:00:00Z",
    endretAv: "Ola Nordmann",
    endretDato: "2026-06-12T10:00:00Z",
    låsAv: null,
    mappe: "Bank/Kontoutskrifter",
  },
];

const mockMappeAction = vi.fn(async ({ request }: { request: Request }) => {
  mottatteMappehandlinger.push(await request.json());
  return svarFraMappehandling;
});
let mottatteMappehandlinger: unknown[] = [];
let svarFraMappehandling: unknown = { ok: true };

const mockFilAction = vi.fn(async ({ request }: { request: Request }) => {
  const svar = {
    ...svarFraFilhandling,
    body: request.method === "PATCH" ? await request.json() : undefined,
  };
  // Som i appen: teknisk feil svarer 500, så React Router ikke revaliderer.
  return svarFraFilhandling.teknisk ? data(svar, { status: 500 }) : svar;
});
let svarFraFilhandling: Record<string, unknown> = { ok: true };

type Valgfrie = "mapper" | "dokumenter" | "redigerbar" | "kanEndreMapper" | "kanEndreFiler";
type TestProps = Omit<Parameters<typeof FilTre>[0], Valgfrie> &
  Partial<Pick<Parameters<typeof FilTre>[0], Valgfrie>>;

async function velgIMeny(element: string, valg: string) {
  fireEvent.click(screen.getByRole("button", { name: `Handlinger for ${element}` }));
  fireEvent.click(await screen.findByRole("menuitem", { name: valg }));
}

async function renderSeksjon({
  mapper = [],
  dokumenter = [],
  redigerbar = false,
  kanEndreMapper = redigerbar,
  kanEndreFiler = redigerbar,
  ...props
}: TestProps) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => (
        <FilTre
          mapper={mapper}
          dokumenter={dokumenter}
          redigerbar={redigerbar}
          kanEndreMapper={kanEndreMapper}
          kanEndreFiler={kanEndreFiler}
          {...props}
        />
      ),
    },
    {
      path: "/api/saker/:sakId/mapper",
      action: mockMappeAction,
    },
    {
      path: "/api/saker/:sakId/filer/:filId",
      action: mockFilAction,
    },
  ]);
  const resultat = render(<Stub initialEntries={["/saker/SAK-1"]} />);
  await waitFor(() => {});
  return resultat;
}

describe("FilTre", () => {
  beforeEach(() => {
    mockFilAction.mockClear();
    svarFraFilhandling = { ok: true };
    mockMappeAction.mockClear();
    mottatteMappehandlinger = [];
    svarFraMappehandling = { ok: true };
  });

  it("viser tomtilstand når det ikke er noen filer", async () => {
    await renderSeksjon({ filer: [], sakId: "SAK-1", kanEndreFiler: false });
    expect(screen.getByText("Ingen dokumenter eller filer ennå")).toBeDefined();
  });

  it("viser filnavn for hver fil", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", kanEndreFiler: false });
    expect(screen.getByText("anmeldelse.pdf")).toBeDefined();
    expect(screen.getByText("screenshot.png")).toBeDefined();
  });

  it("viser størrelse og type i metadatalinjen", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", kanEndreFiler: false });
    expect(screen.getByText(/Opplastet · PDF · 200 KB · Lastet opp/)).toBeDefined();
    expect(screen.getByText(/Opplastet · Bilde · 50 KB · Lastet opp/)).toBeDefined();
  });

  it("viser åpne-knapp for hver fil", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", kanEndreFiler: false });
    expect(screen.getByLabelText("Åpne anmeldelse.pdf")).toBeDefined();
    expect(screen.getByLabelText("Åpne screenshot.png")).toBeDefined();
  });

  it("viser ingen meny når brukeren verken er sakseier eller kan endre mapper", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", kanEndreFiler: false });
    expect(screen.queryByRole("button", { name: "Handlinger for anmeldelse.pdf" })).toBeNull();
  });

  it("viser valg for å gi nytt navn og slette når kanEndreFiler er true", async () => {
    await renderSeksjon({
      filer: mockFiler,
      sakId: "SAK-1",
      kanEndreMapper: true,
      kanEndreFiler: true,
    });
    fireEvent.click(screen.getByRole("button", { name: "Handlinger for anmeldelse.pdf" }));
    expect(await screen.findByRole("menuitem", { name: "Gi nytt navn" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Slett" })).toBeDefined();
  });

  it("åpner menyen ved høyreklikk på raden", async () => {
    await renderSeksjon({
      filer: mockFiler,
      sakId: "SAK-1",
      kanEndreMapper: true,
      kanEndreFiler: true,
    });
    const rad = screen.getByText("anmeldelse.pdf").closest("li") as HTMLElement;

    const standardHindret = !fireEvent.contextMenu(rad);

    expect(standardHindret).toBe(true);
    expect(await screen.findByRole("menuitem", { name: "Gi nytt navn" })).toBeDefined();
  });

  it("beholder nettleserens meny ved høyreklikk på en lenke", async () => {
    await renderSeksjon({
      dokumenter: [{ ...mockDokumenter[0], mappe: null }],
      filer: [],
      sakId: "SAK-1",
      kanEndreFiler: false,
      redigerbar: true,
    });

    const standardHindret = !fireEvent.contextMenu(
      screen.getByRole("link", { name: "Saksframlegg" }),
    );

    expect(standardHindret).toBe(false);
    expect(screen.queryByRole("menuitem")).toBeNull();
  });

  it("åpner modal med navnedelen og låst filendelse", async () => {
    await renderSeksjon({
      filer: mockFiler,
      sakId: "SAK-1",
      kanEndreMapper: true,
      kanEndreFiler: true,
    });

    await velgIMeny("anmeldelse.pdf", "Gi nytt navn");

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Endre navn på vedlegg" })).toBeDefined();
    });
    expect(screen.getByRole("textbox", { name: "Filnavn" }).getAttribute("value")).toBe(
      "anmeldelse",
    );
    expect(screen.getByText("Filendelsen .pdf beholdes.")).toBeDefined();
  });

  it("viser teknisk feilmelding ved endring av mappenavn uten å lukke modal eller tømme navnet", async () => {
    svarFraMappehandling = { ok: false, teknisk: true, usikker: false, feilId: "feil-123" };
    await renderSeksjon({
      mapper: ["Bank"],
      filer: [],
      sakId: "SAK-1",
      kanEndreMapper: true,
    });

    await velgIMeny("mappen Bank", "Gi nytt navn");
    fireEvent.change(screen.getByRole("textbox", { name: "Mappenavn" }), {
      target: { value: "Ny Bank" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lagre navn" }));

    expect(await screen.findByText("Vi fikk ikke endret navnet på mappen")).toBeDefined();
    expect(screen.getByText("feil-123")).toBeDefined();
    expect(screen.queryByText("Kunne ikke oppdatere mappene")).toBeNull();
    expect((screen.getByRole("textbox", { name: "Mappenavn" }) as HTMLInputElement).value).toBe(
      "Ny Bank",
    );
  });

  it("viser valideringsfeil for ugyldig navn", async () => {
    await renderSeksjon({
      filer: mockFiler,
      sakId: "SAK-1",
      kanEndreMapper: true,
      kanEndreFiler: true,
    });
    await velgIMeny("anmeldelse.pdf", "Gi nytt navn");
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Endre navn på vedlegg" })).toBeDefined();
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Filnavn" }), {
      target: { value: "../bevis" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lagre navn" }));

    expect(screen.getByText("Filnavnet inneholder ugyldige tegn")).toBeDefined();
  });

  it("sender gyldig navnedel som JSON og lukker modalen ved suksess", async () => {
    await renderSeksjon({
      filer: mockFiler,
      sakId: "SAK-1",
      kanEndreMapper: true,
      kanEndreFiler: true,
    });
    await velgIMeny("anmeldelse.pdf", "Gi nytt navn");
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Endre navn på vedlegg" })).toBeDefined();
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Filnavn" }), {
      target: { value: "ny anmeldelse" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Lagre navn" }));

    await waitFor(() => {
      expect(mockFilAction).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog", { name: "Endre navn på vedlegg" })).toBeNull();
    });
    const request = mockFilAction.mock.calls[0]?.[0].request;
    expect(request.method).toBe("PATCH");
  });

  it("viser lastespinner når en opplasting pågår", async () => {
    await renderSeksjon({ filer: [], sakId: "SAK-1", kanEndreFiler: false, lasterOpp: true });
    expect(screen.getByText("Laster opp …")).toBeDefined();
  });

  it("viser feilmelding fra serveren", async () => {
    await renderSeksjon({
      filer: [],
      sakId: "SAK-1",
      kanEndreFiler: false,
      feilFraServer: "Filen er for stor",
    });
    expect(screen.getByText("Filen er for stor")).toBeDefined();
  });

  it("viser 'i bruk'-ikon når filen er satt inn i et dokument", async () => {
    const filerMedBruk: FilResponse[] = [
      { ...mockFiler[1], bruktIDokumenter: [{ id: "dok-1", tittel: "Saksframlegg" }] },
    ];
    await renderSeksjon({ filer: filerMedBruk, sakId: "SAK-1", kanEndreFiler: false });
    expect(screen.getByLabelText("Filen er i bruk i 1 dokument(er)")).toBeDefined();
  });

  it("viser ikke 'i bruk'-ikon når filen ikke er i bruk", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", kanEndreFiler: false });
    expect(screen.queryByText(/er i bruk i/)).toBeNull();
  });

  it("viser forklarende dialog i stedet for å slette når filen er i bruk", async () => {
    const filerMedBruk: FilResponse[] = [
      { ...mockFiler[1], bruktIDokumenter: [{ id: "dok-1", tittel: "Saksframlegg" }] },
    ];
    await renderSeksjon({ filer: filerMedBruk, sakId: "SAK-1", kanEndreFiler: true });

    await velgIMeny("screenshot.png", "Slett");
    await waitFor(() => {});

    expect(screen.getByText("Filen er i bruk")).toBeDefined();
    const lenke = screen.getByRole("link", { name: "Saksframlegg" });
    expect(lenke.getAttribute("href")).toBe("/saker/SAK-1/dokumenter/dok-1");
  });

  it("viser bekreftelsesdialog før en fil slettes", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", kanEndreFiler: true });

    await velgIMeny("screenshot.png", "Slett");
    await waitFor(() => {});

    expect(screen.getByText("Slette vedlegg?")).toBeDefined();
    expect(screen.getByRole("button", { name: "Slett vedlegg" })).toBeDefined();
  });

  it("lukker bekreftelsesdialogen uten å slette", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", kanEndreFiler: true });

    await velgIMeny("screenshot.png", "Slett");
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => {});

    expect(screen.queryByText("Slette vedlegg?")).toBeNull();
  });

  it("viser teknisk feilmelding ved sletting uten å lukke bekreftelsesdialogen", async () => {
    svarFraFilhandling = { ok: false, teknisk: true, usikker: false, feilId: "feil-456" };
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", kanEndreFiler: true });

    await velgIMeny("screenshot.png", "Slett");
    fireEvent.click(await screen.findByRole("button", { name: "Slett vedlegg" }));

    expect(await screen.findByText("Vi fikk ikke slettet filen")).toBeDefined();
    expect(screen.getByText("feil-456")).toBeDefined();
    expect(screen.getByText("Prøv igjen om litt.")).toBeDefined();
    expect(screen.getByText("Slette vedlegg?")).toBeDefined();
  });

  describe("mapper", () => {
    const mapper = ["Bank", "Bank/Kontoutskrifter", "Tom mappe"];

    it("viser mapper lukket med antall filer, og dokumenter i undermapper teller med", async () => {
      await renderSeksjon({
        mapper,
        dokumenter: mockDokumenter,
        filer: [],
        sakId: "SAK-1",
        kanEndreFiler: false,
      });

      const bank = screen.getByRole("button", { name: /Bank\s*1 fil/ });
      expect(bank.getAttribute("aria-expanded")).toBe("false");
      expect(screen.getByRole("button", { name: /Tom mappe\s*0 filer/ })).toBeDefined();
      expect(screen.queryByText("Saksframlegg")).toBeNull();
    });

    it("åpner og lukker mapper, også nestede", async () => {
      await renderSeksjon({
        mapper,
        dokumenter: mockDokumenter,
        filer: [],
        sakId: "SAK-1",
        kanEndreFiler: false,
      });

      fireEvent.click(screen.getByRole("button", { name: /^Bank/ }));
      fireEvent.click(screen.getByRole("button", { name: /^Kontoutskrifter/ }));
      expect(screen.getByRole("link", { name: "Saksframlegg" })).toBeDefined();
      expect(screen.getByText(/Redigerbart · Opprettet i Watson Sak · Sist endret/)).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: /^Bank/ }));
      expect(screen.queryByRole("link", { name: "Saksframlegg" })).toBeNull();
    });

    it("legger alt i en rotmappe med saksnummeret, med mapper før filer", async () => {
      await renderSeksjon({
        mapper: ["Zulu"],
        filer: mockFiler,
        sakId: "SAK-1",
        kanEndreFiler: false,
      });
      const tre = screen.getByRole("list", { name: "Dokumenter og filer" });
      expect(within(tre).getAllByRole("listitem")[0]).toBe(
        screen.getByRole("button", { name: /^Sak SAK-1/, expanded: true }).closest("li"),
      );
      const rotmappe = screen.getByRole("list", { name: "Sak SAK-1" });
      const elementer = within(rotmappe)
        .getAllByRole("listitem")
        .map((li) => li.textContent ?? "");
      expect(elementer[0]).toContain("Zulu");
      expect(elementer[1]).toContain("anmeldelse.pdf");
    });

    it("viser ikke mappehandlinger eller flyttevalg når treet ikke er redigerbart", async () => {
      await renderSeksjon({ mapper, filer: mockFiler, sakId: "SAK-1", kanEndreFiler: true });
      expect(screen.queryByLabelText("Handlinger for mappen Bank")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Handlinger for anmeldelse.pdf" }));
      expect(await screen.findByRole("menuitem", { name: "Slett" })).toBeDefined();
      expect(screen.queryByRole("menuitem", { name: "Flytt til …" })).toBeNull();
    });

    describe("ufordelt sak (kan laste opp, men ikke endre saken)", () => {
      const ufordelt = {
        mapper,
        dokumenter: [{ ...mockDokumenter[0], mappe: null }],
        filer: mockFiler,
        sakId: "SAK-1",
        kanEndreFiler: false,
        kanEndreMapper: true,
      };

      it("har ingen meny for dokumenter, siden de verken kan slettes eller flyttes", async () => {
        await renderSeksjon(ufordelt);
        expect(screen.queryByRole("button", { name: "Handlinger for Saksframlegg" })).toBeNull();
      });

      it("kan omdøpe og flytte mapper, men ikke slette dem", async () => {
        await renderSeksjon(ufordelt);
        fireEvent.click(screen.getByRole("button", { name: "Handlinger for mappen Bank" }));
        expect(await screen.findByRole("menuitem", { name: "Gi nytt navn" })).toBeDefined();
        expect(screen.getByRole("menuitem", { name: "Flytt til …" })).toBeDefined();
        expect(screen.queryByRole("menuitem", { name: /Slett mappe/ })).toBeNull();
      });

      it("kan omdøpe og flytte filer, men ikke slette dem", async () => {
        await renderSeksjon(ufordelt);
        fireEvent.click(screen.getByRole("button", { name: "Handlinger for anmeldelse.pdf" }));
        expect(await screen.findByRole("menuitem", { name: "Gi nytt navn" })).toBeDefined();
        expect(screen.getByRole("menuitem", { name: "Flytt til …" })).toBeDefined();
        expect(screen.queryByRole("menuitem", { name: "Slett" })).toBeNull();
      });
    });

    describe("delt med på fordelt sak", () => {
      const deltMed = {
        mapper,
        dokumenter: [{ ...mockDokumenter[0], mappe: null }],
        filer: mockFiler,
        sakId: "SAK-1",
        kanEndreMapper: true,
        kanEndreFiler: true,
      };

      it("kan flytte dokumenter", async () => {
        await renderSeksjon(deltMed);
        fireEvent.click(screen.getByRole("button", { name: "Handlinger for Saksframlegg" }));
        expect(await screen.findByRole("menuitem", { name: "Flytt til …" })).toBeDefined();
      });

      it("kan omdøpe og slette filer", async () => {
        await renderSeksjon(deltMed);
        fireEvent.click(screen.getByRole("button", { name: "Handlinger for anmeldelse.pdf" }));
        expect(await screen.findByRole("menuitem", { name: "Gi nytt navn" })).toBeDefined();
        expect(screen.getByRole("menuitem", { name: "Slett" })).toBeDefined();
      });

      it("kan slette mapper", async () => {
        await renderSeksjon(deltMed);
        fireEvent.click(screen.getByRole("button", { name: "Handlinger for mappen Bank" }));
        expect(await screen.findByRole("menuitem", { name: /Slett mappe/ })).toBeDefined();
      });
    });

    it("flytter en fil til en mappe via flyttedialogen", async () => {
      await renderSeksjon({
        mapper,
        filer: mockFiler,
        sakId: "SAK-1",
        redigerbar: true,
      });

      await velgIMeny("anmeldelse.pdf", "Flytt til …");
      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "Flytt «anmeldelse.pdf»" })).toBeDefined();
      });
      const flyttTil = screen.getByRole("combobox", { name: "Flytt til" });
      expect(
        within(flyttTil)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toContain("Sak SAK-1 / Bank / Kontoutskrifter");
      expect(within(flyttTil).getByRole("option", { name: "Sak SAK-1" })).toHaveProperty("value", "");
      fireEvent.change(flyttTil, {
        target: { value: "Bank/Kontoutskrifter" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Flytt" }));

      await waitFor(() => {
        expect(mottatteMappehandlinger).toEqual([
          { handling: "flytt-fil", id: "fil-1", mappe: "Bank/Kontoutskrifter" },
        ]);
        expect(screen.queryByRole("dialog")).toBeNull();
      });
    });

    it("flytter en fil med dra og slipp", async () => {
      await renderSeksjon({
        mapper,
        filer: mockFiler,
        sakId: "SAK-1",
        redigerbar: true,
      });

      const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
      const fil = screen.getByText("anmeldelse.pdf").closest("li");
      const mål = screen.getByRole("button", { name: /^Tom mappe/ }).closest("li");
      if (!fil || !mål) throw new Error("Fant ikke elementene");

      fireEvent.dragStart(fil, { dataTransfer });
      fireEvent.dragOver(mål, { dataTransfer });
      fireEvent.drop(mål, { dataTransfer });

      await waitFor(() => {
        expect(mottatteMappehandlinger).toEqual([
          { handling: "flytt-fil", id: "fil-1", mappe: "Tom mappe" },
        ]);
      });
    });

    it("lar ikke en mappe slippes i sin egen undermappe", async () => {
      await renderSeksjon({
        mapper,
        dokumenter: mockDokumenter,
        filer: [],
        sakId: "SAK-1",
        redigerbar: true,
      });
      fireEvent.click(screen.getByRole("button", { name: /^Bank/ }));

      const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
      const bank = screen.getByRole("button", { name: /^Bank/ }).closest("li");
      const under = screen.getByRole("button", { name: /^Kontoutskrifter/ }).closest("li");
      if (!bank || !under) throw new Error("Fant ikke elementene");

      fireEvent.dragStart(bank, { dataTransfer });
      fireEvent.dragOver(under, { dataTransfer });
      fireEvent.drop(under, { dataTransfer });

      await waitFor(() => {});
      expect(mockMappeAction).not.toHaveBeenCalled();
    });

    it("kobler mappeknappen til innholdet med en gyldig id, også når navnet har mellomrom", async () => {
      await renderSeksjon({ mapper, filer: [], sakId: "SAK-1", kanEndreFiler: false });
      const knapp = screen.getByRole("button", { name: /^Tom mappe/ });

      fireEvent.click(knapp);

      const id = knapp.getAttribute("aria-controls") ?? "";
      expect(id).not.toMatch(/\s/);
      expect(document.getElementById(id)?.getAttribute("aria-label")).toBe("Tom mappe");
    });

    it("gir en mappe nytt navn, og sender ny sti for mappen", async () => {
      await renderSeksjon({
        mapper,
        dokumenter: mockDokumenter,
        filer: [],
        sakId: "SAK-1",
        redigerbar: true,
      });
      fireEvent.click(screen.getByRole("button", { name: /^Bank/ }));

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Kontoutskrifter"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Gi nytt navn" }));
      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "Gi mappen nytt navn" })).toBeDefined();
      });
      fireEvent.change(screen.getByRole("textbox", { name: "Mappenavn" }), {
        target: { value: "Utskrifter" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Lagre navn" }));

      await waitFor(() => {
        expect(mottatteMappehandlinger).toEqual([
          { handling: "endre", fraSti: "Bank/Kontoutskrifter", tilSti: "Bank/Utskrifter" },
        ]);
      });
    });

    it("avviser mappenavn som allerede finnes på samme nivå", async () => {
      await renderSeksjon({
        mapper,
        filer: [],
        sakId: "SAK-1",
        redigerbar: true,
      });

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Bank"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Gi nytt navn" }));
      await waitFor(() => {
        expect(screen.getByRole("dialog", { name: "Gi mappen nytt navn" })).toBeDefined();
      });
      fireEvent.change(screen.getByRole("textbox", { name: "Mappenavn" }), {
        target: { value: "Tom mappe" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Lagre navn" }));

      expect(screen.getByText("Det finnes allerede en mappe med dette navnet her")).toBeDefined();
      expect(mockMappeAction).not.toHaveBeenCalled();
    });

    it("sletter bare tomme mapper", async () => {
      await renderSeksjon({
        mapper,
        dokumenter: mockDokumenter,
        filer: [],
        sakId: "SAK-1",
        redigerbar: true,
      });

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Bank"));
      const slettBank = await screen.findByRole("menuitem", { name: /Slett mappe/ });
      expect(
        slettBank.getAttribute("aria-disabled") ?? slettBank.getAttribute("data-disabled"),
      ).not.toBeNull();
      fireEvent.keyDown(slettBank, { key: "Escape" });
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByLabelText("Handlinger for mappen Bank"));
      });

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Tom mappe"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Slett mappe" }));

      await waitFor(() => {
        expect(mottatteMappehandlinger).toEqual([{ handling: "slett", sti: "Tom mappe" }]);
      });
    });

    it("flytter fokus til overordnet mappe og sier fra når en undermappe er slettet", async () => {
      await renderSeksjon({
        mapper,
        filer: [],
        sakId: "SAK-1",
        redigerbar: true,
      });
      fireEvent.click(screen.getByRole("button", { name: /^Bank/ }));

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Kontoutskrifter"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Slett mappe" }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Bank/ }));
      });
      expect(screen.getByText("Mappen «Kontoutskrifter» er slettet")).toBeDefined();
    });

    it("flytter fokus til rotmappen når en mappe rett under den er slettet", async () => {
      await renderSeksjon({
        mapper,
        filer: [],
        sakId: "SAK-1",
        redigerbar: true,
      });

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Tom mappe"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Slett mappe" }));

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole("button", { name: /^Sak SAK-1/ }));
      });
    });

    it("viser feil fra mappehandlinger selv om en opplastingsfeil står fra før", async () => {
      mockMappeAction.mockImplementationOnce(
        async () => ({ ok: false, melding: "Mappen er ikke tom" }) as never,
      );
      await renderSeksjon({
        mapper,
        filer: [],
        sakId: "SAK-1",
        redigerbar: true,
        feilFraServer: "Filen er for stor",
      });

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Tom mappe"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Slett mappe" }));

      expect(await screen.findByText("Mappen er ikke tom")).toBeDefined();
      expect(screen.getByText("Filen er for stor")).toBeDefined();
    });

    it("sier ikke fra om sletting når en avvist sletting følges av en vellykket flytting", async () => {
      mockMappeAction.mockImplementationOnce(
        async () => ({ ok: false, melding: "Mappen er ikke tom" }) as never,
      );
      await renderSeksjon({
        mapper,
        filer: mockFiler,
        sakId: "SAK-1",
        redigerbar: true,
      });

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Tom mappe"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Slett mappe" }));
      expect(await screen.findByText("Mappen er ikke tom")).toBeDefined();

      const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };
      const fil = screen.getByText("anmeldelse.pdf").closest("li");
      const mål = screen.getByRole("button", { name: /^Tom mappe/ }).closest("li");
      if (!fil || !mål) throw new Error("Fant ikke elementene");
      fireEvent.dragStart(fil, { dataTransfer });
      fireEvent.dragOver(mål, { dataTransfer });
      fireEvent.drop(mål, { dataTransfer });

      await waitFor(() => {
        expect(mottatteMappehandlinger).toEqual([
          { handling: "flytt-fil", id: "fil-1", mappe: "Tom mappe" },
        ]);
      });
      await waitFor(() => expect(screen.queryByText("Mappen er ikke tom")).toBeNull());
      expect(screen.queryByText(/er slettet/)).toBeNull();
    });

    it("viser feilmelding fra serveren når en mappehandling feiler", async () => {
      mockMappeAction.mockImplementationOnce(
        async () => ({ ok: false, melding: "Mappen finnes allerede" }) as never,
      );
      await renderSeksjon({
        mapper,
        filer: [],
        sakId: "SAK-1",
        redigerbar: true,
      });

      fireEvent.click(screen.getByLabelText("Handlinger for mappen Tom mappe"));
      fireEvent.click(await screen.findByRole("menuitem", { name: "Slett mappe" }));

      expect(await screen.findByText("Mappen finnes allerede")).toBeDefined();
    });
  });
});
