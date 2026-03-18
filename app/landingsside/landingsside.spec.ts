import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Landingsside", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("viser velkomsthilsen med brukerens navn", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /God (morgen|dag|ettermiddag|kveld|natt), Saks/,
      }),
    ).toBeVisible();
  });

  test("viser mine saker-oversikt", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Mine saker" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Se alle" })).toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
