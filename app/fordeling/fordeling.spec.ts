import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Ufordelte saker", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/fordeling", { waitUntil: "networkidle" });
  });

  test("viser nytt hovedinnhold for ufordelte saker", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Ufordelte saker i Analyse" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Vis" })).toHaveCount(0);
    await expect(page.getByText("Ikke fordelt")).toBeVisible();
    await expect(page.getByText("Liggetid for eldste sak")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Kategori" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Misbrukstype" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Opprettet" })).toBeVisible();
    await expect(page.getByRole("link", { name: "#111" })).toBeVisible();
    await expect(page.getByRole("link", { name: "#102" })).toHaveCount(0);
    await expect(
      page.locator("#maincontent").getByRole("searchbox", { name: "Søk i saker" }),
    ).toHaveCount(0);
  });

  // Sidedelingen dekkes av UfordelteSakerInnhold.test.tsx: mockdataene har færre saker enn én side.
  test("kan sortere, filtrere og tildele en sak fra tabellen", async ({ page }) => {
    const rader = page.locator("tbody tr");

    await expect(async () => {
      await page.getByRole("button", { name: "Sorter på kategori" }).click();
      await expect(page.getByRole("columnheader", { name: "Kategori" })).toHaveAttribute(
        "aria-sort",
        "ascending",
        { timeout: 1000 },
      );
    }).toPass({ timeout: 10000 });

    const sak111 = rader.filter({ hasText: "111" });
    await expect(sak111).toHaveCount(1);
    await expect(sak111).toContainText("Tiltak");
    await expect(sak111).toContainText("Misbruk av tiltaksplass");

    const tiltakFilter = page.getByRole("button", { name: "Tiltak", exact: true });
    await tiltakFilter.click();
    await expect(tiltakFilter).toHaveAttribute("aria-pressed", "true");

    const misbrukstypeFilter = page.getByRole("button", {
      name: "Misbruk av tiltaksplass",
      exact: true,
    });
    await misbrukstypeFilter.click();

    await expect(misbrukstypeFilter).toHaveAttribute("aria-pressed", "true");
    await expect(sak111).toHaveCount(1);
    await sak111.getByRole("button", { name: "Tildel" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Saksbehandler").fill("Amalie Olsen");
    await dialog.getByRole("option", { name: "Amalie Olsen (Z300003)" }).click();

    const tildelKnapp = dialog.getByRole("button", { name: "Tildel" });
    await expect(tildelKnapp).toBeEnabled();

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/fordeling") && response.request().method() === "POST",
      ),
      tildelKnapp.click(),
    ]);

    await expect(dialog).not.toBeVisible();
    await expect(sak111).toHaveCount(0);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
