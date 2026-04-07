import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";

test.describe("Ufordelte saker – tildeling", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/fordeling", { waitUntil: "networkidle" });
  });

  test("kan tildele sak og få den bort fra listen", async ({ page }) => {
    const radSomSkalTildeles = page.locator("tbody tr").filter({ hasText: "Enslig forsørger" });
    await expect(radSomSkalTildeles).toHaveCount(1);
    await expect(radSomSkalTildeles).toContainText("Feilutbetaling");

    await radSomSkalTildeles.getByRole("button", { name: "Tildel" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Tildel saksbehandler" })).toBeVisible();

    await dialog.getByLabel("Saksbehandler").selectOption("Kari Nordmann");
    const tildelKnapp = dialog.getByRole("button", { name: "Tildel" });
    await expect(tildelKnapp).toBeEnabled();
    await tildelKnapp.click();

    await expect(dialog).not.toBeVisible();
    await expect(page.locator("tbody tr").filter({ hasText: "Enslig forsørger" })).toHaveCount(0);
  });
});
