import { describe, expect, test } from "vitest";
import { finnAktivtTema } from "./theme-utils";

describe("finnAktivtTema", () => {
  test("bruker systemets mørke tema når preferansen er system og systemet er mørkt", () => {
    expect(finnAktivtTema("system", true)).toBe("dark");
  });

  test("bruker systemets lyse tema når preferansen er system og systemet er lyst", () => {
    expect(finnAktivtTema("system", false)).toBe("light");
  });

  test("respekterer eksplisitt valgt tema", () => {
    expect(finnAktivtTema("dark", false)).toBe("dark");
    expect(finnAktivtTema("light", true)).toBe("light");
  });
});
