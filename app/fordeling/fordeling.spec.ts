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
    await page.getByRole("button", { name: "Feilutbetaling" }).click();
    await page.getByRole("button", { name: "Barnetrygd" }).click();

    const rader = page.locator("tbody tr");
    await expect
      .poll(async () => {
        const tekster = await rader.allTextContents();

        return tekster.every(
          (tekst) => tekst.includes("Barnetrygd") && tekst.includes("Feilutbetaling"),
        );
      })
      .toBe(true);
  });

  test("kan bla til neste side i tabellen", async ({ page }) => {
    await page.getByRole("button", { name: "2" }).click();

    await expect(page.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "true");
    const oppfølgingRad = page.locator("tbody tr").filter({ hasText: "Oppfølging" });
    await expect(oppfølgingRad).toHaveCount(1);
    await expect(oppfølgingRad).toContainText("Foreldrepenger");
  });

  test("kan sortere på kategori, ytelse og opprettet", async ({ page }) => {
    const rader = page.locator("tbody tr");

    await page.getByRole("button", { name: "Sorter på kategori" }).click();
    await expect(rader.nth(0)).toContainText("Feilutbetaling");

    await page.getByRole("button", { name: "Sorter på opprettet" }).click();
    await expect(rader.nth(0)).toContainText("16. feb. 2026");

    await page.getByRole("button", { name: "Sorter på ytelse" }).click();
    await expect(rader.nth(0)).toContainText("Barnetrygd");
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
