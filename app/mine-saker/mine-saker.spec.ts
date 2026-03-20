import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Mine saker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/mine-saker", { waitUntil: "networkidle" });
  });

  test("viser aktive saker og lukkede seksjoner for ventende og fullførte saker", async ({
    page,
  }) => {
    const hovedinnhold = page.locator("#maincontent");

    await expect(page.getByRole("heading", { name: "Mine saker" })).toBeVisible();
    await expect(hovedinnhold.getByRole("button", { name: "Oppgaver på vent" })).toBeVisible();
    await expect(hovedinnhold.getByRole("button", { name: "Fullførte oppgaver" })).toBeVisible();
    await expect(hovedinnhold.getByRole("link")).toHaveCount(4);
  });

  test("kan åpne ventende og fullførte saker", async ({ page }) => {
    const hovedinnhold = page.locator("#maincontent");
    const ventendeKnapp = hovedinnhold.getByRole("button", { name: "Oppgaver på vent" });
    const fullførteKnapp = hovedinnhold.getByRole("button", { name: "Fullførte oppgaver" });

    await ventendeKnapp.click();
    await expect(hovedinnhold.getByRole("link")).toHaveCount(6);

    await fullførteKnapp.click();
    await expect(hovedinnhold.getByRole("link")).toHaveCount(10);
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
