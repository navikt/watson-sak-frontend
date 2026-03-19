import { describe, expect, test } from "vitest";
import { defaultPreferences, parsePreferences } from "./PreferencesCookie";

describe("PreferencesCookie", () => {
  test("støtter systemtema og velkomstmelding i preferanser", () => {
    const preferences = parsePreferences({
      sidebarKollapset: true,
      tema: "system",
      visVelkomstmelding: false,
    });

    expect(preferences).toEqual({
      sidebarKollapset: true,
      tema: "system",
      visVelkomstmelding: false,
    });
  });

  test("gir bakoverkompatible defaultverdier for nye preferanser", () => {
    expect(defaultPreferences).toEqual({
      sidebarKollapset: false,
      tema: "system",
      visVelkomstmelding: true,
    });
  });
});
