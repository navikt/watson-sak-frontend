import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { DokumentEditor } from "./DokumentEditor";
import { lagKommentar, lagListe, lagTraad } from "./kommentarer/kommentar-fixtures";
import type { Kommentarliste, Kommentartraad } from "./kommentarer/typer";

const innhold: DokumentInnhold = [
  { type: "h2", id: "blokk-overskrift", children: [{ text: "Min overskrift" }] },
  { type: "p", id: "blokk-1", children: [{ text: "Brødtekst med et viktig poeng." }] },
];

const forankretTraad: Kommentartraad = lagTraad({
  opprettetAvIdent: "Z111111",
  opprettetAvNavn: "Kari Hansen",
  kommentarer: [
    lagKommentar({
      forfatterIdent: "Z111111",
      forfatterNavn: "Kari Hansen",
      tekst: "Kan vi utdype dette?",
      erEgen: false,
    }),
  ],
});

const løstTraad: Kommentartraad = lagTraad({
  ...forankretTraad,
  id: "33333333-3333-4333-8333-333333333333",
  resolved: "2026-03-02T09:00:00Z",
  kommentarer: [{ ...forankretTraad.kommentarer[0], id: "44444444-4444-4444-8444-444444444444" }],
});

function liste(traader: Kommentartraad[], overstyringer: Partial<Kommentarliste> = {}) {
  return lagListe({ traader, ...overstyringer });
}

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
          variabelVerdier={{}}
          kommentarliste={liste([forankretTraad])}
          kommentarUrl="/api/saker/ABC-1/dokumenter/d1/kommentarer"
          {...props}
        />
      ),
    },
  ]);
  return render(<Stub initialEntries={["/saker/ABC-1"]} />);
}

function renderEditorMedDynamiskDyplenke() {
  function Vert() {
    const [dyplenkeAktiv, settDyplenkeAktiv] = useState(false);
    return (
      <>
        <button type="button" onClick={() => settDyplenkeAktiv(true)}>
          Simuler ny dyplenke
        </button>
        <DokumentEditor
          startInnhold={innhold}
          redigerbar
          onEndring={() => {}}
          sakId="ABC-1"
          docId="d1"
          dokumentliste={<p>Dokumentliste</p>}
          variabelVerdier={{}}
          kommentarliste={liste([forankretTraad])}
          kommentarUrl="/api/saker/ABC-1/dokumenter/d1/kommentarer"
          startSidepanel={dyplenkeAktiv ? "kommentarer" : undefined}
          startKommentartraadId={dyplenkeAktiv ? forankretTraad.id : null}
        />
      </>
    );
  }
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: Vert,
    },
  ]);
  return render(<Stub initialEntries={["/saker/ABC-1"]} />);
}

describe("DokumentEditor med kommentarer", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: true, traad: null }))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("åpner kommentarpanelet direkte når ruta ber om det", async () => {
    renderEditor({ startSidepanel: "kommentarer" });

    expect(await screen.findByRole("heading", { name: "Kommentarer" })).toBeDefined();
    expect(screen.getByText("Kan vi utdype dette?")).toBeDefined();
  });

  it("synkroniserer en ny kommentardyplenke uten å remounte editoren", async () => {
    renderEditorMedDynamiskDyplenke();
    expect(screen.queryByRole("heading", { name: "Kommentarer" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Simuler ny dyplenke" }));

    expect(await screen.findByRole("heading", { name: "Kommentarer" })).toBeDefined();
    await waitFor(() => {
      expect(screen.getByRole("article", { name: "Kari Hansen" }).getAttribute("data-aktiv")).toBe(
        "true",
      );
    });
  });

  it("viser antall uløste kommentarer som badge i panelmenyen", async () => {
    renderEditor({ kommentarliste: liste([forankretTraad, løstTraad]) });

    // Panelet står på «Dokumenter», så badgen vises ved siden av panelnavnet.
    expect(await screen.findByText("1")).toBeDefined();
  });

  it("lar deg bytte til kommentarpanelet fra sidepanelmenyen", async () => {
    renderEditor();

    fireEvent.click(await screen.findByRole("button", { name: /Dokumenter/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Kommentarer/ }));

    expect(await screen.findByRole("heading", { name: "Kommentarer" })).toBeDefined();
  });

  it("markerer forankret tekst i dokumentet uten å skrive kommentar-id i innholdet", async () => {
    const onEndring = vi.fn();
    renderEditor({ onEndring });

    await waitFor(() => {
      const markering = document.querySelector("mark[data-kommentartraad]");
      expect(markering?.textContent).toBe("viktig poeng");
    });

    const markering = document.querySelector("mark[data-kommentartraad]");
    expect(markering?.getAttribute("data-kommentartraad")).toBe(forankretTraad.id);

    // Dokumentverdien skal ikke inneholde noe kommentar-spor.
    const serialisert = JSON.stringify(onEndring.mock.calls.at(-1)?.[0] ?? innhold);
    expect(serialisert).not.toContain(forankretTraad.id);
    expect(serialisert).not.toContain("kommentar");
  });

  it("viser markeringen som en svak gul highlight og gjør den sterkere når tråden velges", async () => {
    renderEditor();

    await waitFor(() => {
      expect(document.querySelector("mark[data-kommentartraad]")).not.toBeNull();
    });
    const markering = document.querySelector("mark[data-kommentartraad]");
    if (!markering) throw new Error("Fant ingen kommentarmarkering");

    expect(markering.classList.contains("bg-ax-bg-warning-soft")).toBe(true);
    expect(markering.className).not.toContain("text-decoration");

    fireEvent.click(markering);

    await waitFor(() => {
      const aktivMarkering = document.querySelector("mark[data-kommentar-aktiv='true']");
      expect(aktivMarkering?.classList.contains("bg-ax-bg-warning-moderate")).toBe(true);
    });
  });

  it("beholder elementknappen når pekeren flyttes fra avsnittet til knappen", async () => {
    renderEditor();

    const avsnitt = await screen.findByText(/Brødtekst med et/);
    fireEvent.mouseOver(avsnitt);

    const knapp = await screen.findByRole("button", { name: "Kommenter avsnitt" });
    fireEvent.mouseOver(knapp);

    expect(screen.getByRole("button", { name: "Kommenter avsnitt" })).toBeDefined();
  });

  it("beholder elementknappen når den får tastaturfokus og kan aktivere den", async () => {
    renderEditor();

    const avsnitt = await screen.findByText(/Brødtekst med et/);
    fireEvent.focus(avsnitt);

    const knapp = await screen.findByRole("button", { name: "Kommenter avsnitt" });
    fireEvent.focus(knapp);

    expect(screen.getByRole("button", { name: "Kommenter avsnitt" })).toBeDefined();
    fireEvent.click(knapp);
    expect(await screen.findByText("Ny kommentar på avsnitt")).toBeDefined();
  });

  it("markerer ikke løste tråder i dokumentet", async () => {
    renderEditor({ kommentarliste: liste([løstTraad]) });

    await screen.findByLabelText("Dokumentinnhold");
    await waitFor(() => {
      expect(document.querySelector("mark[data-kommentartraad]")).toBeNull();
    });
  });

  it("åpner og fokuserer tråden når man klikker på markeringen", async () => {
    renderEditor();

    await waitFor(() => {
      expect(document.querySelector("mark[data-kommentartraad]")).not.toBeNull();
    });
    const markering = document.querySelector("mark[data-kommentartraad]");
    if (!markering) throw new Error("Fant ingen kommentarmarkering");

    fireEvent.click(markering);

    expect(await screen.findByRole("heading", { name: "Kommentarer" })).toBeDefined();
    await waitFor(() => {
      expect(screen.getByRole("article", { name: "Kari Hansen" }).getAttribute("data-aktiv")).toBe(
        "true",
      );
    });
  });

  it("lar tastaturbrukere åpne tråden fra en tekstmarkering", async () => {
    renderEditor();

    const markering = await waitFor(() => {
      const element = screen.getByRole("button", { name: "Kommentar. Åpne kommentarpanelet." });
      expect(element.getAttribute("tabindex")).toBe("0");
      return element;
    });

    fireEvent.keyDown(markering, { key: "Enter" });

    expect(await screen.findByRole("heading", { name: "Kommentarer" })).toBeDefined();
    await waitFor(() => {
      expect(screen.getByRole("article", { name: "Kari Hansen" }).getAttribute("data-aktiv")).toBe(
        "true",
      );
    });
  });

  it("lar lesetilgang kommentere på et dokument som ikke kan redigeres", async () => {
    renderEditor({ redigerbar: false, startSidepanel: "kommentarer" });

    // Ingen verktøylinje, men kommentarpanelet og «Ny kommentar» er tilgjengelig.
    expect(screen.queryByRole("toolbar")).toBeNull();
    expect(await screen.findByRole("button", { name: "Ny kommentar" })).toHaveProperty(
      "disabled",
      false,
    );
  });

  it("gjør kommentarpanelet read-only på arkivert dokument", async () => {
    renderEditor({
      redigerbar: false,
      kommentarliste: liste([], { kanKommentere: false, arkivert: "2026-04-01T10:00:00Z" }),
      startSidepanel: "kommentarer",
    });

    expect(
      await screen.findByText("Dokumentet er arkivert. Kommentarer kan leses, men ikke endres."),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Ny kommentar" })).toHaveProperty("disabled", true);
  });

  it("viser frakoblet tråd uten markering når sitatet er borte", async () => {
    const frakoblet: Kommentartraad = lagTraad({
      ...forankretTraad,
      anker: {
        type: "TEXT",
        nodeId: "finnes-ikke",
        path: [9],
        startOffset: 0,
        sluttOffset: 10,
        exact: "borte tekst",
        prefix: "",
        suffix: "",
      },
      opprinneligSitat: "borte tekst",
    });
    renderEditor({ kommentarliste: liste([frakoblet]), startSidepanel: "kommentarer" });

    expect(
      await screen.findByText("Frakoblet – teksten finnes ikke lenger i dokumentet"),
    ).toBeDefined();
    expect(document.querySelector("mark[data-kommentartraad]")).toBeNull();
  });

  it("oppretter en generell kommentar via panelet", async () => {
    renderEditor({ kommentarliste: liste([]), startSidepanel: "kommentarer" });

    fireEvent.click(await screen.findByRole("button", { name: "Ny kommentar" }));
    fireEvent.change(await screen.findByLabelText("Kommentar"), {
      target: { value: "Generell merknad" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Legg til kommentar" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/saker/ABC-1/dokumenter/d1/kommentarer",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const kropp = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string) as {
      handling: string;
      ankerType: string;
      anker: Record<string, unknown>;
      ankerVersjon?: number;
      tekst: string;
    };
    // Eksakt backendkontrakt: ankerType og anker er adskilt, teksten heter «tekst».
    expect(kropp).toMatchObject({
      handling: "opprett_traad",
      ankerType: "DOCUMENT",
      anker: {},
      tekst: "Generell merknad",
    });
    expect(kropp.anker).not.toHaveProperty("type");
  });
});
