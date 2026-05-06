import { expect, test } from "@playwright/test";

import { medMockDataLock } from "~/test/mock-data-lock";
import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Ufordelte saker", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/fordeling", { waitUntil: "networkidle" });
  });

  test("viser nytt hovedinnhold for ufordelte saker", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Ufordelte saker" })).toBeVisible();
    await expect(page.getByText("14 ufordelte saker")).toBeVisible();
    await expect(page.getByText(/Eldste sak har ligget i \d+ dager/)).toBeVisible();
    await expect(
      page.getByText("Gjelder ytelsene Barnetrygd, Dagpenger, Foreldrepenger, Sykepenger og AAP"),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Kategori" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Misbrukstype" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Opprettet" })).toBeVisible();
    await expect(
      page.locator("#maincontent").getByRole("searchbox", { name: "Søk i saker" }),
    ).toHaveCount(0);
  });

  test("kan sortere, paginere, filtrere og tildele en sak fra tabellen", async ({ page }) => {
    await medMockDataLock(async () => {
      await resetMockData(page);
      await page.goto("/fordeling", { waitUntil: "networkidle" });

      const rader = page.locator("tbody tr");

      await page.getByRole("button", { name: "Sorter på kategori" }).click();
      await expect(rader.nth(0)).toContainText("Annet");

      await page.getByRole("button", { name: "2" }).click();

      await expect(page.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "true");
      const tiltakRad = page.locator("tbody tr").filter({ hasText: "Tiltak" });
      await expect(tiltakRad).toHaveCount(1);
      await expect(tiltakRad).toContainText("Misbruk av tiltaksplass");

      const samlivKnapp = page.getByRole("button", { name: "Samliv" });
      await samlivKnapp.click();
      await expect(samlivKnapp).toHaveAttribute("aria-pressed", "true");

      await page.getByRole("button", { name: "Barnetrygd" }).click();

      const sakSomSkalTildeles = page
        .locator("tbody tr")
        .filter({ hasText: "101" })
        .filter({ hasText: "Endret sivilstatus" })
        .filter({ hasText: "Samliv" });

      await expect(sakSomSkalTildeles).toHaveCount(1);
      await sakSomSkalTildeles.getByRole("button", { name: "Tildel" }).click();

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
      await expect(sakSomSkalTildeles).toHaveCount(0);
    });
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
