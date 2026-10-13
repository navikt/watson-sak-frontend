import { describe, expect, test } from "vitest";
import { defaultPreferences, parsePreferences } from "./PreferencesCookie";

describe("PreferencesCookie", () => {
  test("støtter systemtema og velkomstmelding i preferanser", () => {
    const preferences = parsePreferences({
      sidebarKollapset: true,
      tema: "system",
      visVelkomstmelding: false,
      visInfopaneler: false,
      onboardingFullført: false,
    });

    expect(preferences).toEqual({
      sidebarKollapset: true,
      tema: "system",
      visVelkomstmelding: false,
      visInfopaneler: false,
      onboardingFullført: false,
    });
  });

  test("gir bakoverkompatible defaultverdier for nye preferanser", () => {
    expect(defaultPreferences).toEqual({
      sidebarKollapset: false,
      tema: "system",
      visVelkomstmelding: true,
      visInfopaneler: true,
      onboardingFullført: false,
    });
  });

  test("viser infopaneler som standard for eksisterende preferansecookies", () => {
    const preferences = parsePreferences({
      sidebarKollapset: true,
      tema: "dark",
      visVelkomstmelding: false,
    });

    expect(preferences.visInfopaneler).toBe(true);
  });

  test("setter onboardingFullført til false for eksisterende preferansecookies", () => {
    const preferences = parsePreferences({
      sidebarKollapset: true,
      tema: "dark",
      visVelkomstmelding: false,
      visInfopaneler: false,
    });

    expect(preferences.onboardingFullført).toBe(false);
  });

  test("bevarer true for onboardingFullført", () => {
    const preferences = parsePreferences({ ...defaultPreferences, onboardingFullført: true });

    expect(preferences.onboardingFullført).toBe(true);
  });
});
