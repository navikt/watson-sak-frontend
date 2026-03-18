import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Landingsside", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("viser velkomsthilsen med brukerens navn", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /God (morgen|dag|ettermiddag|kveld|natt), Saks/,
      }),
    ).toBeVisible();
  });

  test("viser mine saker-oversikt", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Mine saker" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Se alle" })).toBeVisible();
  });

  test("kan markere et varsel som lest og beholde det som lest etter refresh", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).toBeVisible();

    await page.getByRole("button", { name: "Marker som lest" }).first().click();

    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Sak #102 har ny hendelse" })).toBeVisible();

    await page.reload({ waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Sak #102 har ny hendelse" })).toBeVisible();
  });

  test("viser siste varsler og kan vise flere uleste varsler", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Siste varsler" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Marker som lest" })).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Vis flere" })).toBeVisible();

    await page.getByRole("button", { name: "Vis flere" }).click();

    await expect(page.getByRole("button", { name: "Marker som lest" })).toHaveCount(7);
    await expect(page.getByRole("button", { name: "Vis flere" })).not.toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
