import { describe, expect, it } from "vitest";
import { erAktivSakKontrollsak } from "./tilgjengeligeHandlinger";

describe("erAktivSakKontrollsak", () => {
  it("returnerer true for aktive statuser", () => {
    expect(erAktivSakKontrollsak("OPPRETTET")).toBe(true);
    expect(erAktivSakKontrollsak("UTREDES")).toBe(true);
    expect(erAktivSakKontrollsak("STRAFFERETTSLIG_VURDERING")).toBe(true);
    expect(erAktivSakKontrollsak("ANMELDT")).toBe(true);
    expect(erAktivSakKontrollsak("HENLAGT")).toBe(true);
  });

  it("returnerer false for AVSLUTTET", () => {
    expect(erAktivSakKontrollsak("AVSLUTTET")).toBe(false);
  });
});
