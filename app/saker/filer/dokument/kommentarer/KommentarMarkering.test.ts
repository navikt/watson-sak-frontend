import { describe, expect, it } from "vitest";
import { segmenter, type Kommentarmarkering } from "./KommentarMarkering";

function markering(traadId: string, startOffset: number, sluttOffset: number): Kommentarmarkering {
  return { traadId, path: [0], startOffset, sluttOffset };
}

describe("segmenter", () => {
  it("lager ett segment for én markering", () => {
    expect(segmenter([markering("a", 2, 8)])).toEqual([{ start: 2, slutt: 8, traadIder: ["a"] }]);
  });

  it("deler overlappende markeringer i disjunkte segmenter", () => {
    expect(segmenter([markering("a", 0, 10), markering("b", 5, 15)])).toEqual([
      { start: 0, slutt: 5, traadIder: ["a"] },
      { start: 5, slutt: 10, traadIder: ["a", "b"] },
      { start: 10, slutt: 15, traadIder: ["b"] },
    ]);
  });

  it("håndterer en markering som ligger helt inni en annen", () => {
    expect(segmenter([markering("ytre", 0, 20), markering("indre", 5, 10)])).toEqual([
      { start: 0, slutt: 5, traadIder: ["ytre"] },
      { start: 5, slutt: 10, traadIder: ["ytre", "indre"] },
      { start: 10, slutt: 20, traadIder: ["ytre"] },
    ]);
  });

  it("lager ikke segmenter i hull mellom markeringer", () => {
    expect(segmenter([markering("a", 0, 3), markering("b", 10, 12)])).toEqual([
      { start: 0, slutt: 3, traadIder: ["a"] },
      { start: 10, slutt: 12, traadIder: ["b"] },
    ]);
  });

  it("slår sammen identiske markeringer til ett segment med begge trådene", () => {
    expect(segmenter([markering("a", 4, 9), markering("b", 4, 9)])).toEqual([
      { start: 4, slutt: 9, traadIder: ["a", "b"] },
    ]);
  });

  it("gir ingen segmenter uten markeringer", () => {
    expect(segmenter([])).toEqual([]);
  });
});
