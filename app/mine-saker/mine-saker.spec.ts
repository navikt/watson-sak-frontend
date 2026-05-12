import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Mine saker", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/mine-saker", { waitUntil: "networkidle" });
  });

  test("viser saksliste med statusfiltre", async ({ page }) => {
    const hovedinnhold = page.locator("#maincontent");

    await expect(page.getByRole("heading", { name: "Mine saker" })).toBeVisible();
    await expect(hovedinnhold.getByLabel("Filtrer saker")).toBeVisible();
    await expect(hovedinnhold.getByRole("link")).toHaveCount(5);
  });

  test("kan filtrere på ventestatus for å vise ventende saker", async ({ page }) => {
    const hovedinnhold = page.locator("#maincontent");

    // Klikk «Venter på vedtak» for å inkludere ventende saker
    await hovedinnhold.getByRole("button", { name: "Venter på vedtak" }).click();
    await expect(hovedinnhold.getByRole("link")).toHaveCount(6);
  });

  test("kan navigere til sakdetalj", async ({ page }) => {
    const sakLenke = page.locator("#maincontent").getByRole("link").first();

    await expect(sakLenke).toBeVisible();
    await sakLenke.click();
    await expect(page).toHaveURL(/\/saker\/\d+/);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
