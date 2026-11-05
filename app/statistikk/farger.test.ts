import { describe, expect, it } from "vitest";
import { fargeForKode, kakeGradient, tekstfargeForKode } from "./farger";

describe("tekstfargeForKode", () => {
  it("bruker Aksel sin kontrastfarge, bortsett fra på oransje bakgrunn", () => {
    expect(tekstfargeForKode("UTREDNING")).toBe("--watson-data-warning-tekst");
    expect(tekstfargeForKode("OPPRETTET")).toBe("--ax-text-neutral-contrast");
    expect(tekstfargeForKode("POLITI")).toBe("--ax-text-neutral-contrast");
  });
});

describe("fargeForKode", () => {
  it("gir kjente statistikkserier ulike Aksel-farger", () => {
    const farger = [
      fargeForKode("SAMLIV"),
      fargeForKode("ARBEID"),
      fargeForKode("UTLAND"),
      fargeForKode("IDENTITET"),
      fargeForKode("TILTAK"),
      fargeForKode("DOKUMENTFALSK"),
      fargeForKode("ANNET"),
      fargeForKode("BEHANDLER"),
    ];

    expect(new Set(farger).size).toBe(farger.length);
  });

  it("gir stegene i saksflyten ulike Aksel-farger", () => {
    const farger = ["OPPRETTET", "UTREDNING", "FORVALTNING", "AVSLUTTET", "POLITI", "STRAFFE"].map(
      fargeForKode,
    );

    expect(new Set(farger).size).toBe(farger.length);
  });

  it("bruker aldri info-strong, som er identisk med brand-blue-strong i Aksel", () => {
    const koder = ["SAMLIV", "ARBEID", "UTLAND", "POLITI", "FORVALTNING", "NY_KATEGORI", "X", "YZ"];
    for (let i = 0; i < 50; i++) koder.push(`KODE_${i}`);

    expect(koder.map(fargeForKode)).not.toContain("--ax-bg-info-strong");
  });

  it("gir POLITI Watson-teal og BEHANDLER mørk aksent", () => {
    expect(fargeForKode("POLITI")).toBe("--watson-data-teal");
    expect(fargeForKode("BEHANDLER")).toBe("--ax-accent-900");
  });

  it("gir utredning tydelig oransje", () => {
    expect(fargeForKode("UTREDNING")).toBe("--ax-warning-500");
  });

  it("bruker aldri de brune beige- og lime-fargene, heller ikke for ukjente koder", () => {
    const koder = ["NY_KATEGORI", "X", "YZ"];
    for (let i = 0; i < 50; i++) koder.push(`KODE_${i}`);

    const farger = koder.map(fargeForKode);
    expect(farger.some((farge) => /beige|lime/.test(farge))).toBe(false);
  });

  it("normaliserer tankestrek i koder", () => {
    expect(fargeForKode("ETTER–UTREDNING")).toBe(fargeForKode("ETTER-UTREDNING"));
  });

  it("gir stabile farger også for ukjente koder", () => {
    expect(fargeForKode("NY_KATEGORI")).toBe(fargeForKode("NY_KATEGORI"));
  });

  it("gir backendens UTREDNING samme farge som UTREDES", () => {
    expect(fargeForKode("UTREDNING")).toBe(fargeForKode("UTREDES"));
  });
});

describe("kakeGradient", () => {
  it("legger en skillestrek i bakgrunnsfargen mellom segmentene", () => {
    const gradient = kakeGradient([
      { farge: "--a", verdi: 1 },
      { farge: "--b", verdi: 0 },
      { farge: "--c", verdi: 3 },
    ]);

    expect(gradient).toBe(
      "conic-gradient(var(--a) 0deg 88.5deg, var(--ax-bg-default) 88.5deg 90deg, " +
        "var(--c) 90deg 358.5deg, var(--ax-bg-default) 358.5deg 360deg)",
    );
  });

  it("lar små segmenter beholde en farget del", () => {
    const gradient = kakeGradient([
      { farge: "--a", verdi: 1 },
      { farge: "--b", verdi: 999 },
    ]);

    expect(gradient).toMatch(
      /^conic-gradient\(var\(--a\) 0deg 0\.18deg, var\(--ax-bg-default\) 0\.18deg 0\.36deg/,
    );
  });

  it("dropper skillestreken når det bare er ett segment", () => {
    expect(kakeGradient([{ farge: "--a", verdi: 5 }])).toBe("conic-gradient(var(--a) 0deg 360deg)");
  });

  it("viser en nøytral ring når alt er null", () => {
    expect(kakeGradient([{ farge: "--a", verdi: 0 }])).toContain("--ax-bg-neutral-moderate");
  });
});
