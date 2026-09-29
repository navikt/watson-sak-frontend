import { describe, expect, it } from "vitest";
import {
  byttPrefiks,
  erLikEllerUnder,
  forelder,
  forfedre,
  kanFlytteMappe,
  mappenavn,
  mappestiSchema,
  slåSammen,
} from "./mappesti";

describe("mappestiSchema", () => {
  it("trimmer hvert nivå", () => {
    expect(mappestiSchema.parse(" Bank / 2024 ")).toBe("Bank/2024");
  });

  it.each(["", "Bank/", "/Bank", "Bank//2024", "Bank/..", ".", "Bank\\2024", "Bank/\u0007"])(
    "avviser ugyldig sti %j",
    (sti) => {
      expect(mappestiSchema.safeParse(sti).success).toBe(false);
    },
  );

  it("tillater tegn som % og _", () => {
    expect(mappestiSchema.parse("100%_ferdig")).toBe("100%_ferdig");
  });
});

describe("stihjelpere", () => {
  it("finner navn, forelder og forfedre", () => {
    expect(mappenavn("A/B/C")).toBe("C");
    expect(forelder("A/B/C")).toBe("A/B");
    expect(forelder("A")).toBeNull();
    expect(forfedre("A/B/C")).toEqual(["A", "A/B"]);
    expect(slåSammen(null, "A")).toBe("A");
    expect(slåSammen("A", "B")).toBe("A/B");
  });

  it("skiller mellom undermappe og mappe med samme prefiks", () => {
    expect(erLikEllerUnder("Lønn/2024", "Lønn")).toBe(true);
    expect(erLikEllerUnder("Lønn", "Lønn")).toBe(true);
    expect(erLikEllerUnder("Lønnsslipper", "Lønn")).toBe(false);
  });

  it("bytter prefiks bare for stier under mappen", () => {
    expect(byttPrefiks("Lønn/2024", "Lønn", "Arkiv/Lønn")).toBe("Arkiv/Lønn/2024");
    expect(byttPrefiks("Lønnsslipper", "Lønn", "Arkiv/Lønn")).toBe("Lønnsslipper");
  });

  it("hindrer at en mappe flyttes inn i seg selv eller dit den allerede er", () => {
    expect(kanFlytteMappe("A", "A")).toBe(false);
    expect(kanFlytteMappe("A", "A/B")).toBe(false);
    expect(kanFlytteMappe("A/B", "A")).toBe(false);
    expect(kanFlytteMappe("A/B", null)).toBe(true);
    expect(kanFlytteMappe("A", "AB")).toBe(true);
    expect(kanFlytteMappe("A", null)).toBe(false);
  });
});
