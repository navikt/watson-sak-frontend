import { expect, test } from "@playwright/test";

import { medMockDataLock } from "~/test/mock-data-lock";
import { resetMockData } from "~/test/reset-mock-data";

test.describe("Oppretting og tildeling av sak", () => {
  test("opprettet sak kan fordeles og vises under mine saker", async ({ page }) => {
    await medMockDataLock(async () => {
      await resetMockData(page);

      await page.goto("/registrer-sak", { waitUntil: "networkidle" });

      await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
      await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();
      await expect(
        page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
      ).toBeVisible();

      await page.getByLabel("Kategori").selectOption("DOKUMENTFALSK");
      await page.getByLabel("Kilde").selectOption("NAV_KONTROLL");
      await page.getByRole("button", { name: "Opprett sak" }).click();

      await expect(page).toHaveURL(/\/saker\/200$/);
      await expect(page.getByRole("heading", { name: /^Sak 200/ })).toBeVisible();

      await page.goto("/fordeling", { waitUntil: "networkidle" });

      const nySakRad = page
        .locator("tbody tr")
        .filter({ hasText: "200" })
        .filter({ hasText: "Dokumentfalsk" });

      await expect(nySakRad).toHaveCount(1);
      await nySakRad.getByRole("button", { name: "Tildel" }).click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("Saksbehandler").selectOption("Z999999");

      const tildelt = page.waitForResponse(
        (response) =>
          response.url().includes("/fordeling") && response.request().method() === "POST",
      );
      await dialog.getByRole("button", { name: "Tildel" }).click();
      await tildelt;

      await expect(dialog).not.toBeVisible();
      await expect(nySakRad).toHaveCount(0);

      await page.goto("/mine-saker", { waitUntil: "networkidle" });

      const minSakLenke = page.locator("#maincontent").getByRole("link", { name: "200" });
      await expect(minSakLenke).toBeVisible();

      await minSakLenke.click();
      await expect(page).toHaveURL(/\/saker\/200$/);
      await expect(page.getByRole("heading", { name: /^Sak 200/ })).toBeVisible();
    });
  });
});
