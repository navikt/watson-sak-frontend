import { describe, expect, it } from "vitest";
import type { AnkerTreff } from "./anker";
import { lagTraad } from "./kommentar-fixtures";
import { antallUloste, sorterTraader } from "./sortering";
import type { Kommentartraad } from "./typer";

function traad(id: string, overstyringer: Partial<Kommentartraad> = {}): Kommentartraad {
  return lagTraad({ id, ...overstyringer });
}

function tekstTreff(path: number[], startOffset = 0): AnkerTreff {
  return { type: "TEXT", path, startOffset, sluttOffset: startOffset + 1 };
}

const LØST = "2026-03-02T09:00:00Z";

describe("sorterTraader", () => {
  it("setter uløste før løste", () => {
    const traader = [traad("løst", { resolved: LØST }), traad("uløst")];
    const treff = new Map<string, AnkerTreff | null>([
      ["løst", tekstTreff([0])],
      ["uløst", tekstTreff([1])],
    ]);

    expect(sorterTraader(traader, treff).map((t) => t.id)).toEqual(["uløst", "løst"]);
  });

  it("setter generelle kommentarer før forankrede", () => {
    const traader = [
      traad("forankret"),
      traad("generell", { ankertype: "DOCUMENT", anker: { type: "DOCUMENT" } }),
    ];
    const treff = new Map<string, AnkerTreff | null>([
      ["forankret", tekstTreff([0])],
      ["generell", { type: "DOCUMENT" }],
    ]);

    expect(sorterTraader(traader, treff).map((t) => t.id)).toEqual(["generell", "forankret"]);
  });

  it("sorterer forankrede i dokumentrekkefølge", () => {
    const traader = [traad("c"), traad("a"), traad("b")];
    const treff = new Map<string, AnkerTreff | null>([
      ["c", tekstTreff([2])],
      ["a", tekstTreff([0])],
      ["b", tekstTreff([1])],
    ]);

    expect(sorterTraader(traader, treff).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("sorterer flere tråder i samme blokk på offset", () => {
    const traader = [traad("sen"), traad("tidlig")];
    const treff = new Map<string, AnkerTreff | null>([
      ["sen", tekstTreff([0], 40)],
      ["tidlig", tekstTreff([0], 5)],
    ]);

    expect(sorterTraader(traader, treff).map((t) => t.id)).toEqual(["tidlig", "sen"]);
  });

  it("setter frakoblede tråder sist, eldst først", () => {
    const traader = [
      traad("frakoblet-ny", { opprettet: "2026-02-01T00:00:00Z" }),
      traad("frakoblet-gammel", { opprettet: "2026-01-01T00:00:00Z" }),
      traad("forankret"),
    ];
    const treff = new Map<string, AnkerTreff | null>([
      ["frakoblet-ny", null],
      ["frakoblet-gammel", null],
      ["forankret", tekstTreff([5])],
    ]);

    expect(sorterTraader(traader, treff).map((t) => t.id)).toEqual([
      "forankret",
      "frakoblet-gammel",
      "frakoblet-ny",
    ]);
  });

  it("muterer ikke inndataene", () => {
    const traader = [traad("b"), traad("a")];
    const treff = new Map<string, AnkerTreff | null>([
      ["b", tekstTreff([1])],
      ["a", tekstTreff([0])],
    ]);

    sorterTraader(traader, treff);
    expect(traader.map((t) => t.id)).toEqual(["b", "a"]);
  });
});

describe("antallUloste", () => {
  it("teller bare tråder som ikke er adressert", () => {
    expect(antallUloste([traad("a"), traad("b", { resolved: LØST }), traad("c")])).toBe(2);
  });
});
