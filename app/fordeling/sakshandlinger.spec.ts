import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";

test.describe("Ufordelte saker – tildeling", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/fordeling", { waitUntil: "networkidle" });
  });

  test("kan tildele sak og få den bort fra listen", async ({ page }) => {
    const radSomSkalTildeles = page
      .locator("tbody tr")
      .filter({ hasText: "101" })
      .filter({ hasText: "Endret sivilstatus" })
      .filter({ hasText: "Samliv" });

    await expect(radSomSkalTildeles).toHaveCount(1);
    await expect(radSomSkalTildeles).toContainText("Samliv");

    await radSomSkalTildeles.getByRole("button", { name: "Tildel" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Tildel saksbehandler" })).toBeVisible();

    await dialog.getByLabel("Saksbehandler").selectOption("Z123456");
    const tildelKnapp = dialog.getByRole("button", { name: "Tildel" });
    await expect(tildelKnapp).toBeVisible();
    await expect(tildelKnapp).toBeEnabled();
    // Knappen fjerner seg selv fra DOM når modalen lukkes etter klikk – force:true
    // lar Playwright klikke uten å feile på at elementet forsvinner etterpå.
    await tildelKnapp.click({ force: true });

    await expect(dialog).not.toBeVisible();
    await expect(
      page
        .locator("tbody tr")
        .filter({ hasText: "101" })
        .filter({ hasText: "Endret sivilstatus" })
        .filter({ hasText: "Samliv" }),
    ).toHaveCount(0);
  });
});
