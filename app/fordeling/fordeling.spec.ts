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
    await expect(page.getByText("12 ufordelte saker")).toBeVisible();
    await expect(page.getByText(/Eldste sak har ligget i \d+ dager/)).toBeVisible();
    await expect(
      page.getByText(
        "Gjelder ytelsene Barnetrygd, Dagpenger, Enslig forsørger, Foreldrepenger, Sykepenger og AAP",
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
    const arbeidKnapp = page.getByRole("button", { name: "Arbeid" });
    await arbeidKnapp.click();
    await expect(arbeidKnapp).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Barnetrygd" }).click();

    const rader = page.locator("tbody tr");
    await expect(rader).not.toHaveCount(0);
    await expect
      .poll(async () => {
        const tekster = await rader.allTextContents();

        return tekster.every((tekst) => tekst.includes("Barnetrygd") && tekst.includes("Arbeid"));
      })
      .toBe(true);
  });

  test("kan bla til neste side i tabellen", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();

    await expect(page.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "true");
    const tiltakRad = page.locator("tbody tr").filter({ hasText: "Tiltak" });
    await expect(tiltakRad).toHaveCount(1);
    await expect(tiltakRad).toContainText("Foreldrepenger");
  });

  test("kan sortere på kategori, ytelse og opprettet", async ({ page }) => {
    const rader = page.locator("tbody tr");

    await page.getByRole("button", { name: "Sorter på kategori" }).click();
    await expect(rader.nth(0)).toContainText("Arbeid");

    await page.getByRole("button", { name: "Sorter på opprettet" }).click();
    await expect(rader.nth(0)).toContainText("16. feb. 2026");

    await page.getByRole("button", { name: "Sorter på ytelse" }).click();
    await expect(rader.nth(0)).toContainText("Barnetrygd");
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
