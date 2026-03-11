import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Statistikk", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/statistikk");
  });

  test("viser overskrift", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Statistikk" })).toBeVisible();
  });

  test("viser nøkkeltall", async ({ page }) => {
    const nøkkeltall = page.getByRole("region", { name: "Nøkkeltall" });
    await expect(nøkkeltall.getByText("Totalt")).toBeVisible();
    await expect(nøkkeltall.getByText("Under utredning")).toBeVisible();
    await expect(nøkkeltall.getByText("Avsluttet")).toBeVisible();
    await expect(nøkkeltall.getByText("Henlagt")).toBeVisible();
  });

  test("viser saker per status", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Saker per status" })).toBeVisible();
  });

  test("viser saker per seksjon", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Saker per seksjon" })).toBeVisible();
  });

  test("viser fordeling per ytelse", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Fordeling per ytelse" })).toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
