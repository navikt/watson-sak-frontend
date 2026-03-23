import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Ufordelte saker", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fordeling", { waitUntil: "networkidle" });
  });

  test("viser nytt hovedinnhold for ufordelte saker", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Ufordelte saker" })).toBeVisible();
    await expect(page.getByText("12 ufordelte saker")).toBeVisible();
    await expect(page.getByText("Eldste sak har ligget i 69 dager")).toBeVisible();
    await expect(
      page.getByText(
        "Gjelder ytelsene Enslig forsørger, Dagpenger, Barnetrygd, Sykepenger, AAP og Foreldrepenger",
      ),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Kategori" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Ytelse" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Opprettet" })).toBeVisible();
    await expect(
      page.locator("#maincontent").getByRole("searchbox", { name: "Søk i saker" }),
    ).toHaveCount(0);
  });

  test("kan filtrere på kategori og ytelse", async ({ page }) => {
    await page.getByRole("button", { name: "Samliv" }).click();
    await page.getByRole("button", { name: "Barnetrygd" }).click();

    const rader = page.locator("tbody tr");
    await expect(rader).toHaveCount(2);
    await expect(rader.nth(0)).toContainText("Samliv");
    await expect(rader.nth(0)).toContainText("Barnetrygd");
    await expect(rader.nth(1)).toContainText("Samliv");
    await expect(rader.nth(1)).toContainText("Barnetrygd");
  });

  test("kan bla til neste side i tabellen", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();

    await expect(page.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");
    const tiltakRad = page.locator("tbody tr").filter({ hasText: "Tiltak" });
    await expect(tiltakRad).toHaveCount(1);
    await expect(tiltakRad).toContainText("Foreldrepenger");
  });

  test("kan sortere på kategori, ytelse og opprettet", async ({ page }) => {
    const rader = page.locator("tbody tr");

    await page.getByRole("button", { name: "Sorter på kategori" }).click();
    await expect(rader.nth(0)).toContainText("Annet");

    await page.getByRole("button", { name: "Sorter på ytelse" }).click();
    await expect(rader.nth(0)).toContainText("AAP");

    await page.getByRole("button", { name: "Sorter på opprettet" }).click();
    await expect(rader.nth(0)).toContainText("16. feb. 2026");
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
