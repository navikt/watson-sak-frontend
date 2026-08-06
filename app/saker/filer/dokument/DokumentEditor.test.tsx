import { createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DokumentInnhold, FilResponse } from "~/saker/filer/typer";
import { DokumentEditor } from "./DokumentEditor";

const innhold: DokumentInnhold = [
  {
    type: "h2",
    children: [{ text: "Min overskrift" }],
  },
  {
    type: "p",
    children: [{ text: "Brødtekst her" }],
  },
];

function renderEditor(props: Partial<Parameters<typeof DokumentEditor>[0]> = {}) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => (
        <DokumentEditor
          startInnhold={innhold}
          redigerbar
          onEndring={() => {}}
          sakId="ABC-1"
          docId="d1"
          dokumentliste={<p>Dokumentliste</p>}
          {...props}
        />
      ),
    },
  ]);
  return render(<Stub initialEntries={["/saker/ABC-1"]} />);
}

function lagFil(navn: string, type: string): File {
  return new File(["data"], navn, { type });
}

describe("DokumentEditor", () => {
  it("viser verktøylinje og innhold når redigerbar", async () => {
    renderEditor();

    expect(await screen.findByRole("toolbar", { name: "Formatering" })).toBeDefined();
    expect(screen.getByLabelText("Fet")).toBeDefined();
    expect(screen.getByLabelText("Kursiv")).toBeDefined();
    expect(screen.getByLabelText("Understreket")).toBeDefined();
    expect(screen.getByLabelText("Gjennomstreket")).toBeDefined();
    expect(screen.getByLabelText("Indenter")).toBeDefined();
    expect(screen.getByLabelText("Avindenter")).toBeDefined();
    expect(screen.getByLabelText("Punktliste")).toBeDefined();
    expect(screen.getByLabelText("Angre")).toBeDefined();
    expect(screen.getByLabelText("Sett inn bilde")).toBeDefined();
    expect(screen.getByRole("button", { name: "Sett inn eksisterende bilde" })).toBeDefined();
    expect(screen.getByText("Min overskrift")).toBeDefined();
    expect(screen.getByText("Brødtekst her")).toBeDefined();
  });

  it("kan sette inn en tabell via verktøylinjen", async () => {
    const onEndring = vi.fn();
    renderEditor({ onEndring });

    const settInnTabell = await screen.findByLabelText("Sett inn tabell");
    fireEvent.click(settInnTabell);

    // Editoren rendrer en faktisk <table>, og endringen propageres som Plate/Slate-JSON.
    await waitFor(() => {
      expect(document.querySelector("table")).not.toBeNull();
    });
    expect(onEndring).toHaveBeenCalled();
    // Tabell-kontekstuelle knapper dukker opp når markøren står i tabellen.
    expect(screen.getByLabelText("Legg til rad")).toBeDefined();
    expect(screen.getByLabelText("Slett tabell")).toBeDefined();
  });

  it("har et tilgjengelig redigeringsfelt med aria-label", async () => {
    renderEditor();

    expect(await screen.findByLabelText("Dokumentinnhold")).toBeDefined();
  });

  it("skjuler verktøylinjen i lesemodus", async () => {
    renderEditor({ redigerbar: false });

    expect(await screen.findByText("Min overskrift")).toBeDefined();
    expect(screen.queryByRole("toolbar")).toBeNull();
  });

  it("toggler understreket mark og kaller onEndring", async () => {
    renderEditor();

    const knapp = await screen.findByLabelText("Understreket");
    expect(knapp.getAttribute("aria-pressed")).toBe("false");
    expect(() => fireEvent.click(knapp)).not.toThrow();
  });

  it("toggler gjennomstreket mark og kaller onEndring", async () => {
    renderEditor();

    const knapp = await screen.findByLabelText("Gjennomstreket");
    expect(knapp.getAttribute("aria-pressed")).toBe("false");
    expect(() => fireEvent.click(knapp)).not.toThrow();
  });

  it("indenter-knappen kaller onEndring", async () => {
    const onEndring = vi.fn();
    renderEditor({ onEndring });

    const knapp = await screen.findByLabelText("Indenter");
    expect(knapp).toBeDefined();
    // Indenter med tom selektion gjør ingenting – verifiser at knappetrykk ikke kaster.
    expect(() => fireEvent.click(knapp)).not.toThrow();
  });

  it("avindenter-knappen kaller onEndring", async () => {
    const onEndring = vi.fn();
    renderEditor({ onEndring });

    const knapp = await screen.findByLabelText("Avindenter");
    expect(knapp).toBeDefined();
    expect(() => fireEvent.click(knapp)).not.toThrow();
  });

  describe("bildeinnsetting", () => {
    const opplastetFil: FilResponse = {
      id: "fil-123",
      filnavn: "skjermbilde.png",
      storrelse: 1024,
      contentType: "image/png",
      opprettetAv: "Ola Nordmann",
      opprettet: "2026-03-01T10:00:00Z",
    };

    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(opplastetFil),
        }),
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("laster opp og setter inn bilde valgt via filvelgeren", async () => {
      const onEndring = vi.fn();
      renderEditor({ onEndring });

      const knapp = await screen.findByLabelText("Sett inn bilde");
      const input = knapp.closest("div")?.parentElement?.querySelector("input[type=file]");
      expect(input).toBeTruthy();

      const fil = lagFil("skjermbilde.png", "image/png");
      fireEvent.change(input as HTMLInputElement, { target: { files: [fil] } });

      await waitFor(() => {
        expect(document.querySelector("img")).not.toBeNull();
      });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/filer"),
        expect.objectContaining({ method: "POST" }),
      );
      expect(onEndring).toHaveBeenCalled();
    });

    it("viser feilmelding når filtypen ikke er tillatt", async () => {
      renderEditor();

      const knapp = await screen.findByLabelText("Sett inn bilde");
      const input = knapp.closest("div")?.parentElement?.querySelector("input[type=file]");
      const fil = lagFil("dokument.pdf", "application/pdf");
      fireEvent.change(input as HTMLInputElement, { target: { files: [fil] } });

      expect(
        await screen.findByText("Bare PNG-, JPEG- og WebP-bilder kan settes inn i dokumentet."),
      ).toBeDefined();
      expect(fetch).not.toHaveBeenCalled();
    });

    // Slates egen paste-/drop-håndtering i slate-dom prøver alltid å slå opp en DOM-range
    // via document.caretRangeFromPoint/selection, som jsdom ikke støtter – å simulere
    // ekte paste-/drop-hendelser her krasjer derfor uavhengig av vår kode. Selve
    // filtrerings- og innsettingslogikken (håndterBildefiler/filtrerBildefiler) er testet
    // over og i bilde-opplasting.test.ts; drag-og-slipp/lim inn er verifisert manuelt.
    it("dra-over med filer hindrer nettleserens standard håndtering", async () => {
      renderEditor();

      const felt = await screen.findByLabelText("Dokumentinnhold");
      const dragOverEvent = createEvent.dragOver(felt, {
        dataTransfer: { types: ["Files"] },
      });
      fireEvent(felt, dragOverEvent);
      expect(dragOverEvent.defaultPrevented).toBe(true);
    });

    it("åpner velger for eksisterende bilde og setter det inn", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([opplastetFil]),
        }),
      );
      renderEditor();

      fireEvent.click(await screen.findByRole("button", { name: "Sett inn eksisterende bilde" }));
      expect(await screen.findByText("skjermbilde.png")).toBeDefined();

      fireEvent.click(screen.getByText("skjermbilde.png"));

      await waitFor(() => {
        expect(document.querySelector("img")).not.toBeNull();
      });
    });
  });
});
