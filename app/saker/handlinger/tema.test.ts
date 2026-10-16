import { describe, expect, it } from "vitest";
import { formaterTemavalg } from "./tema";

describe("formaterTemavalg", () => {
  it("bruker beskrivelsen fra kodeverket", () => {
    expect(formaterTemavalg("KTA", [{ kode: "KTA", beskrivelse: "Kontroll anmeldelse" }])).toBe(
      "Kontroll anmeldelse (KTA)",
    );
  });

  it("viser koden når den ikke finnes i kodeverket", () => {
    expect(formaterTemavalg("UKJENT", [])).toBe("UKJENT");
  });
});
