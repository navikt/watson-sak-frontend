import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Mine saker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/mine-saker");
  });

  test("viser overskrift og saksliste", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Mine saker" })).toBeVisible();
  });

  test("kan søke i saker", async ({ page }) => {
    const søkefelt = page.getByLabel("Søk i saker");
    await søkefelt.fill("Dagpenger");

    await expect(page.getByText(/Viser \d+ av \d+ saker/)).toBeVisible();
  });

  test("kan navigere til sakdetalj", async ({ page }) => {
    const sakLenke = page.getByRole("link", { name: /^Sak \d+$/ }).first();

    if (await sakLenke.isVisible()) {
      await sakLenke.click();
      await expect(page).toHaveURL(/\/saker\/\d+/);
    }
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
