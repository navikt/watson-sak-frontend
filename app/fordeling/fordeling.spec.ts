import { expect, test } from "@playwright/test";

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
      page.getByText(
        "Gjelder ytelsene Barnetrygd, Dagpenger, Foreldrepenger, Sykepenger og AAP",
      ),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Kategori" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Misbrukstype" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Opprettet" })).toBeVisible();
    await expect(
      page.locator("#maincontent").getByRole("searchbox", { name: "Søk i saker" }),
    ).toHaveCount(0);
  });

  test("kan filtrere på kategori og ytelse", async ({ page }) => {
    const samlivKnapp = page.getByRole("button", { name: "Samliv" });
    await samlivKnapp.click();
    await expect(samlivKnapp).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Barnetrygd" }).click();

    const rader = page.locator("tbody tr");
    await expect(rader).not.toHaveCount(0);
    await expect
      .poll(async () => {
        const tekster = await rader.allTextContents();

        return tekster.every(
          (tekst) => tekst.includes("Endret sivilstatus") && tekst.includes("Samliv"),
        );
      })
      .toBe(true);
  });

  test("kan bla til neste side i tabellen", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();

    await expect(page.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "true");
    const tiltakRad = page.locator("tbody tr").filter({ hasText: "Tiltak" });
    await expect(tiltakRad).toHaveCount(1);
    await expect(tiltakRad).toContainText("Misbruk av tiltaksplass");
  });

  test("kan sortere på kategori og opprettet", async ({ page }) => {
    const rader = page.locator("tbody tr");

    await page.getByRole("button", { name: "Sorter på kategori" }).click();
    await expect(rader.nth(0)).toContainText("Annet");

    await page.getByRole("button", { name: "Sorter på opprettet" }).click();
    await expect(rader.nth(0)).toContainText("18. feb. 2026");
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
