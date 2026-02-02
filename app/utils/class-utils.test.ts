import { describe, expect, it } from "vitest";
import { cn } from "./class-utils";

describe("cn", () => {
  it("kombinerer flere klasser", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("håndterer én klasse", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("filtrerer bort false", () => {
    expect(cn("foo", false, "bar")).toBe("foo bar");
    expect(cn(false, "foo", false)).toBe("foo");
  });

  it("filtrerer bort undefined", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
    expect(cn(undefined, "foo", undefined)).toBe("foo");
  });

  it("filtrerer bort tom streng", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("fungerer med betingede klasser", () => {
    const erAktiv = true;
    const erDeaktivert = false;
    expect(cn("base", erAktiv && "aktiv", erDeaktivert && "deaktivert")).toBe(
      "base aktiv",
    );
  });

  it("returnerer tom streng når ingen gyldige klasser", () => {
    expect(cn()).toBe("");
    expect(cn(false, undefined)).toBe("");
  });

  it("håndterer komplekse kombinasjoner", () => {
    expect(
      cn(
        "btn",
        "btn-primary",
        true && "btn-large",
        false && "btn-disabled",
        undefined,
        "mt-4",
      ),
    ).toBe("btn btn-primary btn-large mt-4");
  });
});
