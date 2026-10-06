import { describe, expect, it } from "vitest";
import { ALLE_STEG, parseSteg } from "./steg";

describe("stegfiltre", () => {
  it("viser UTREDNING uten avsluttede saker", () => {
    expect(ALLE_STEG).toEqual([
      "OPPRETTET",
      "UTREDNING",
      "FORVALTNING",
      "STRAFFERETTSLIG_VURDERING",
      "POLITI",
    ]);
  });

  it("normaliserer eldre stegkoder og beholder støttede historiske filterlenker", () => {
    expect(parseSteg(["UTREDES", "UTREDNING", "AVSLUTTET", "UKJENT"])).toEqual([
      "UTREDNING",
      "AVSLUTTET",
    ]);
  });
});
