import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Personvern", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/personvern");
  });

  test("viser personverninnhold", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Personvern" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hva samler vi inn?" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Funksjonelle cookies" })).toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
