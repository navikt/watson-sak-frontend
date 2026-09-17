import { act, renderHook } from "@testing-library/react";
import { createPlateEditor } from "platejs/react";
import { describe, expect, it, vi } from "vitest";
import { MAKS_SITATLENGDE } from "./typer";
import { useKommentarforankring } from "./useKommentarforankring";

vi.mock("~/analytics/analytics", () => ({ sporHendelse: vi.fn() }));

const LANG_TEKST = "Ord ".repeat(800).trim(); // ~3200 tegn

function lagEditor(tekst: string) {
  return createPlateEditor({
    value: [
      { type: "p", id: "blokk-0", children: [{ text: "Innledning." }] },
      { type: "p", id: "blokk-1", children: [{ text: tekst }] },
    ],
  });
}

/** Rendrer hooken med en editor der hele blokk 1 er markert. */
function medMarkering(tekst: string) {
  const editor = lagEditor(tekst);
  editor.selection = {
    anchor: { path: [1, 0], offset: 0 },
    focus: { path: [1, 0], offset: tekst.length },
  };

  const { result } = renderHook(() =>
    useKommentarforankring({ editor, traader: [], kanKommentere: true }),
  );
  return { editor, result };
}

describe("useKommentarforankring – sitatlengde", () => {
  it("klipper et langt tekstsitat til backendens grense på 2000 tegn", () => {
    const { result } = medMarkering(LANG_TEKST);

    expect(LANG_TEKST.length).toBeGreaterThan(MAKS_SITATLENGDE);
    act(() => {
      expect(result.current.startTekstutkast("tekstmarkering")).toBe(true);
    });

    const sitat = result.current.utkast?.opprinneligSitat ?? "";
    expect(sitat).toHaveLength(MAKS_SITATLENGDE);
    expect(LANG_TEKST.startsWith(sitat)).toBe(true);
  });

  it("beholder korte sitater uendret", () => {
    const { result } = medMarkering("Et kort og viktig poeng");

    act(() => {
      expect(result.current.startTekstutkast("tekstmarkering")).toBe(true);
    });
    expect(result.current.utkast?.opprinneligSitat).toBe("Et kort og viktig poeng");
  });

  it("lager fortsatt et fullstendig anker selv om sitatet klippes", () => {
    const { result } = medMarkering(LANG_TEKST);

    act(() => {
      result.current.startTekstutkast("tekstmarkering");
    });

    const anker = result.current.utkast?.anker;
    expect(anker).toMatchObject({ type: "TEXT", nodeId: "blokk-1", path: [1] });
    // Ankeret bruker hele markeringen – det er sitatet, ikke forankringen, som klippes.
    expect(anker && anker.type === "TEXT" && anker.exact).toHaveLength(LANG_TEKST.length);
  });

  it("klipper også sitatet for elementkommentarer", () => {
    const editor = lagEditor(LANG_TEKST);
    const { result } = renderHook(() =>
      useKommentarforankring({ editor, traader: [], kanKommentere: true }),
    );

    const dom = document.createElement("p");
    act(() => {
      expect(result.current.startElementutkast({ path: [1], slateType: "p", dom }, "element")).toBe(
        true,
      );
    });
    expect(result.current.utkast?.opprinneligSitat).toHaveLength(MAKS_SITATLENGDE);
  });

  it("lager ikke utkast uten markering", () => {
    const editor = lagEditor("Litt tekst");
    const { result } = renderHook(() =>
      useKommentarforankring({ editor, traader: [], kanKommentere: true }),
    );

    expect(result.current.startTekstutkast("tekstmarkering")).toBe(false);
  });

  it("lager ikke utkast når brukeren ikke kan kommentere", () => {
    const editor = lagEditor("Litt tekst");
    editor.selection = {
      anchor: { path: [1, 0], offset: 0 },
      focus: { path: [1, 0], offset: 5 },
    };
    const { result } = renderHook(() =>
      useKommentarforankring({ editor, traader: [], kanKommentere: false }),
    );

    expect(result.current.startTekstutkast("tekstmarkering")).toBe(false);
  });

  it("lager ikke utkast for markering over flere blokker", () => {
    const editor = lagEditor("Andre avsnitt");
    editor.selection = {
      anchor: { path: [0, 0], offset: 2 },
      focus: { path: [1, 0], offset: 5 },
    };
    const { result } = renderHook(() =>
      useKommentarforankring({ editor, traader: [], kanKommentere: true }),
    );

    expect(result.current.startTekstutkast("tekstmarkering")).toBe(false);
  });
});
