import { describe, expect, it } from "vitest";
import { FARGESKALA, fargeForIndeks, fargestil, kakeGradient } from "./farger";

const a = { fyll: "--a", lys: false };
const b = { fyll: "--b", lys: false };
const c = { fyll: "--c", lys: false };

describe("fargeForIndeks", () => {
  it("starter med de prioriterte fargene", () => {
    expect(fargeForIndeks(0).fyll).toBe("--ax-bg-brand-blue-strong");
    expect(fargeForIndeks(1).fyll).toBe("--ax-text-brand-magenta-decoration");
    expect(fargeForIndeks(2).fyll).toBe("--ax-text-accent-decoration");
  });

  it("har ti ulike farger og går rundt etter det", () => {
    expect(new Set(FARGESKALA.map((f) => f.fyll)).size).toBe(10);
    expect(fargeForIndeks(10)).toBe(fargeForIndeks(0));
  });

  it("gir alle lyse farger en ramme", () => {
    for (const farge of FARGESKALA) {
      expect(Boolean(farge.kant)).toBe(farge.lys);
    }
  });
});

describe("fargestil", () => {
  it("legger innvendig ramme på lyse farger", () => {
    expect(fargestil(fargeForIndeks(3))).toEqual({
      backgroundColor: "var(--ax-bg-brand-blue-moderate)",
      boxShadow: "inset 0 0 0 1px var(--ax-border-brand-blue)",
    });
    expect(fargestil(fargeForIndeks(0))).toEqual({
      backgroundColor: "var(--ax-bg-brand-blue-strong)",
    });
  });
});

describe("kakeGradient", () => {
  it("legger en skillestrek i bakgrunnsfargen mellom segmentene", () => {
    const gradient = kakeGradient([
      { farge: a, verdi: 1 },
      { farge: b, verdi: 0 },
      { farge: c, verdi: 3 },
    ]);

    expect(gradient).toBe(
      "conic-gradient(var(--a) 0deg 88.5deg, var(--ax-bg-default) 88.5deg 90deg, " +
        "var(--c) 90deg 358.5deg, var(--ax-bg-default) 358.5deg 360deg)",
    );
  });

  it("tegner rammefargen langs kantene til lyse segmenter", () => {
    const lys = { fyll: "--lys", kant: "--kant", lys: true };
    const gradient = kakeGradient([
      { farge: lys, verdi: 1 },
      { farge: a, verdi: 1 },
    ]);

    expect(gradient).toContain("var(--kant) 0deg 0.6deg, var(--lys) 0.6deg 177.9deg");
  });

  it("lar små segmenter beholde en farget del", () => {
    const gradient = kakeGradient([
      { farge: a, verdi: 1 },
      { farge: b, verdi: 999 },
    ]);

    expect(gradient).toMatch(
      /^conic-gradient\(var\(--a\) 0deg 0\.18deg, var\(--ax-bg-default\) 0\.18deg 0\.36deg/,
    );
  });

  it("dropper skillestreken når det bare er ett segment", () => {
    expect(kakeGradient([{ farge: a, verdi: 5 }])).toBe("conic-gradient(var(--a) 0deg 360deg)");
  });

  it("viser en nøytral ring når alt er null", () => {
    expect(kakeGradient([{ farge: a, verdi: 0 }])).toContain("--ax-bg-neutral-moderate");
  });
});
