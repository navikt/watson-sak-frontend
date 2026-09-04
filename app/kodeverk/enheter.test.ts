import { describe, expect, it } from "vitest";
import { finnEnhetsnavn } from "./enheter";

const enheter = [
  { kode: "hu424t", beskrivelse: "Nord" },
  { kode: "ky153k", beskrivelse: "Øst" },
];

describe("finnEnhetsnavn", () => {
  it("oversetter enhetskode til enhetsnavn", () => {
    expect(finnEnhetsnavn(enheter, "hu424t")).toBe("Nord");
  });

  it("viser koden som den er når den ikke finnes i kodeverket", () => {
    expect(finnEnhetsnavn(enheter, "4812")).toBe("4812");
  });
});
