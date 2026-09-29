import { expect, test } from "@playwright/test";
import { resetMockData } from "~/test/reset-mock-data";

test.describe("Migreringsveileder med syntetiske saker", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
  });

  test("ferdig eksempel viser notatkort og bekreftelse som kan lukkes", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/migrering");
    await page.getByRole("link", { name: "Ferdig migrert" }).click();

    await expect(page).toHaveURL(/\/saker\/1181$/);
    await expect(page.getByRole("heading", { name: "Filer" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Notat fra opprettelse" })).toBeVisible();
    await expect(
      page.getByText("Eksempelnotat for migrering. Kun syntetisk testinnhold."),
    ).toBeVisible();
    const bekreftelse = page.getByRole("status");
    await expect(bekreftelse).toContainText("Saken er ferdig flyttet");
    await expect(page.getByRole("checkbox", { name: "Saken er ferdig flyttet" })).toHaveCount(0);
    await testInfo.attach("sak-ferdig-desktop", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    await page.getByRole("button", { name: "Lukk bekreftelsen" }).click();
    await expect(bekreftelse).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Notat fra opprettelse" })).toBeVisible();
  });

  test("uferdig eksempel viser avkrysning uten grønn bekreftelse", async ({ page }) => {
    await page.goto("/migrering");
    await page.getByRole("link", { name: "Under flytting" }).click();

    await expect(page).toHaveURL(/\/saker\/1182$/);
    await expect(page.getByRole("checkbox", { name: "Saken er ferdig flyttet" })).toBeDisabled();
    await expect(page.getByText("Migreringsnotat (forhåndsvisning)")).toBeVisible();
    await expect(page.getByText("Saken er ferdig flyttet", { exact: true })).toHaveCount(1);
  });

  test("notatkort og melding er synlige på mobil", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/saker/1181");

    await expect(page.getByRole("link", { name: "Notat fra opprettelse" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Saken er ferdig flyttet");
    await testInfo.attach("sak-ferdig-mobil", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});
