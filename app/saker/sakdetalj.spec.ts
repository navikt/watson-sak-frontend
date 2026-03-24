import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Sakdetalj", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/saker/101", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /^Sak 101$/ })).toBeVisible();
  });

  test("viser saksinformasjon", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^Sak 101$/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Saksinformasjon" })).toBeVisible();
  });

  test("viser historikk-seksjon", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Historikk" })).toBeVisible();
  });

  test("viser handlingsknapper", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Handlinger" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tildel saksbehandler" })).toBeVisible();
  });

  test("kan åpne og lukke tildel-modal", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Tildel saksbehandler" })).toBeEnabled();
    await page.getByRole("button", { name: "Tildel saksbehandler" }).click();
    await page.waitForTimeout(300);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Tildel saksbehandler" })).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Saksbehandler" })).toBeVisible();

    // Vent til modal-animasjonen er ferdig før UU-sjekk
    await sjekkTilgjengelighet(page);

    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("kan åpne og lukke henlegg-modal", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Henlegg" })).toBeEnabled();
    await page.getByRole("button", { name: "Henlegg" }).click();
    await page.waitForTimeout(300);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Henlegg sak" })).toBeVisible();

    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("viser tilbake-knapp", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Tilbake" })).toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
