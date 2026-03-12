import { AxeBuilder } from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Feilhåndtering – 404", () => {
  test("viser 404-side for ukjent rute", async ({ page }) => {
    await page.goto("/denne-siden-finnes-ikke", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Beklager, vi fant ikke siden" })).toBeVisible();
  });

  test("kan navigere tilbake til forsiden", async ({ page }) => {
    await page.goto("/denne-siden-finnes-ikke", { waitUntil: "networkidle" });

    await page.getByRole("link", { name: "Gå til forsiden" }).click();
    await expect(page).toHaveURL("/");
  });

  test("er UU-compliant", async ({ page }) => {
    await page.goto("/denne-siden-finnes-ikke", { waitUntil: "networkidle" });

    // 404-siden bruker eget layout uten #maincontent, så vi kjører axe på main-elementet direkte
    const tilgjengelighetsresultater = await new AxeBuilder({ page }).include("main").analyze();

    if (tilgjengelighetsresultater.violations.length > 0) {
      console.error("🚫♿️ Fant UU-feil ♿️🚫");
      console.error(JSON.stringify(tilgjengelighetsresultater.violations, null, 2));
    }

    expect(tilgjengelighetsresultater.violations).toEqual([]);
  });
});
