import { describe, expect, it } from "vitest";
import { arbeidRapportmal } from "./arbeid";
import { ensligForsørgerRapportmal } from "./enslig-forsørger";
import { byggMalInnhold, type MalId } from "./index";
import { utlandRapportmal } from "./utland";

const MALER: { id: MalId; bygger: typeof arbeidRapportmal }[] = [
  { id: "arbeid", bygger: arbeidRapportmal },
  { id: "enslig-forsørger", bygger: ensligForsørgerRapportmal },
  { id: "utland", bygger: utlandRapportmal },
];

describe("rapportmaler", () => {
  it.each(MALER)("$id: bygger gyldig dokumentinnhold for straffesak", ({ bygger }) => {
    const innhold = bygger({ erStraffesak: true });

    expect(innhold.length).toBeGreaterThan(0);
    for (const node of innhold) {
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("children");
    }
  });

  it.each(MALER)("$id: bygger gyldig dokumentinnhold for ikke-straffesak", ({ bygger }) => {
    const innhold = bygger({ erStraffesak: false });

    expect(innhold.length).toBeGreaterThan(0);
    for (const node of innhold) {
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("children");
    }
  });

  it.each(MALER)("$id: straffesak og ikke-straffesak gir ulikt innhold", ({ bygger }) => {
    const straffesak = bygger({ erStraffesak: true });
    const ikkeStraffesak = bygger({ erStraffesak: false });

    expect(JSON.stringify(straffesak)).not.toBe(JSON.stringify(ikkeStraffesak));
  });

  it("byggMalInnhold delegerer til riktig mal basert på malId", () => {
    const arbeid = byggMalInnhold({ malId: "arbeid", erStraffesak: false });
    const utland = byggMalInnhold({ malId: "utland", erStraffesak: false });

    expect(JSON.stringify(arbeid)).toBe(JSON.stringify(arbeidRapportmal({ erStraffesak: false })));
    expect(JSON.stringify(utland)).toBe(JSON.stringify(utlandRapportmal({ erStraffesak: false })));
  });
});
