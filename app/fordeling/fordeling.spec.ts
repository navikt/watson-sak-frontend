import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Fordeling – saksliste", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fordeling", { waitUntil: "networkidle" });
  });

  test("viser overskrift og sakskort", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Saker til fordeling" })).toBeVisible();
    await expect(page.getByText(/^Sak \d+$/).first()).toBeVisible();
  });

  test("kan søke i saker", async ({ page }) => {
    const søkefelt = page.getByLabel("Søk i saker");
    await søkefelt.fill("Dagpenger");

    await expect(page.getByText(/Viser \d+ av \d+ saker/)).toBeVisible();
  });

  test("kan filtrere på status", async ({ page }) => {
    await page.getByRole("button", { name: "tips mottatt" }).click();

    await expect(page.getByText(/Viser \d+ av \d+ saker/)).toBeVisible();
  });

  test("kan sortere sakene", async ({ page }) => {
    const sortering = page.getByLabel("Sortering");
    await sortering.selectOption("eldst");

    await expect(sortering).toHaveValue("eldst");
  });

  test("kan nullstille filtre", async ({ page }) => {
    // Aktiver et filter først
    await page.getByRole("button", { name: "tips mottatt" }).click();
    await expect(page.getByText(/Viser \d+ av \d+ saker/)).toBeVisible();

    // Nullstill
    await page.getByRole("button", { name: "Nullstill" }).click();
    await expect(page.getByText(/Viser \d+ av \d+ saker/)).not.toBeVisible();
  });

  test("kan navigere til sakdetalj", async ({ page }) => {
    await page
      .getByRole("link", { name: /^Sak \d+$/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/saker\/\d+/);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
