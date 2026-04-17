import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Søk", () => {
  test.describe("søkesiden", () => {
    test.beforeEach(async ({ page }) => {
      await resetMockData(page);
      await page.goto("/søk", { waitUntil: "networkidle" });
    });

    test("viser overskrift og søkefelt", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Søk i saker" })).toBeVisible();
      await expect(page.getByLabel("Søk etter saker")).toBeVisible();
    });

    test("søkefeltet har autofokus", async ({ page }) => {
      await expect(page.getByLabel("Søk etter saker")).toBeFocused();
    });

    test("kan søke på saksnummer og viser resultater", async ({ page }) => {
      await page.getByLabel("Søk etter saker").fill("101");
      await page.getByLabel("Søk etter saker").press("Enter");

      await expect(page.getByText(/1 treff for "101"/)).toBeVisible();
      await expect(page.getByRole("article")).toHaveCount(1);
      await expect(page.getByRole("heading", { name: "Sak 101" })).toHaveCount(1);
    });

    test("kan søke på tags og viser resultater", async ({ page }) => {
      await page.getByLabel("Søk etter saker").fill("dagpenger");
      await page.getByLabel("Søk etter saker").press("Enter");

      await expect(page.getByText(/treff for "dagpenger"/)).toBeVisible();
      const resultater = page.getByRole("article");
      await expect(resultater.first()).toBeVisible();
    });

    test("kan søke på kategori og viser resultater", async ({ page }) => {
      await page.getByLabel("Søk etter saker").fill("Arbeid");
      await page.getByLabel("Søk etter saker").press("Enter");

      await expect(page.getByText(/treff for "Arbeid"/)).toBeVisible();
      await expect(page.getByRole("article").first()).toBeVisible();
    });

    test("viser tom-tilstand ved ingen treff", async ({ page }) => {
      await page.getByLabel("Søk etter saker").fill("finnesikke123");
      await page.getByLabel("Søk etter saker").press("Enter");

      await expect(page.getByText(/Ingen treff for "finnesikke123"/)).toBeVisible();
    });

    test("kan navigere til sakdetalj fra søkeresultat", async ({ page }) => {
      await page.getByLabel("Søk etter saker").fill("101");
      await page.getByLabel("Søk etter saker").press("Enter");

      await page.getByRole("article").first().getByRole("link", { name: "Sak 101" }).click();
      await expect(page).toHaveURL(/\/saker\/101/);
    });

    test("er UU-compliant", async ({ page }) => {
      await sjekkTilgjengelighet(page);
    });

    test("er UU-compliant med søkeresultater", async ({ page }) => {
      await page.getByLabel("Søk etter saker").fill("dagpenger");
      await page.getByLabel("Søk etter saker").press("Enter");
      await expect(page.getByRole("article").first()).toBeVisible();

      await sjekkTilgjengelighet(page);
    });
  });

  test.describe("tastaturnavigering", () => {
    test("ArrowDown fra søkefelt fokuserer første resultat", async ({ page }) => {
      await page.goto("/søk", { waitUntil: "networkidle" });

      await page.getByLabel("Søk etter saker").fill("dagpenger");
      await page.getByLabel("Søk etter saker").press("Enter");
      await expect(page.getByRole("article").first()).toBeVisible();

      await page.getByLabel("Søk etter saker").press("ArrowDown");

      const førsteLenke = page.getByRole("article").first().getByRole("link");
      await expect(førsteLenke).toBeFocused();
    });

    test("ArrowUp fra første resultat fokuserer søkefeltet", async ({ page }) => {
      await page.goto("/søk", { waitUntil: "networkidle" });

      await page.getByLabel("Søk etter saker").fill("dagpenger");
      await page.getByLabel("Søk etter saker").press("Enter");
      await expect(page.getByRole("article").first()).toBeVisible();

      await page.getByLabel("Søk etter saker").press("ArrowDown");
      await page.keyboard.press("ArrowUp");

      await expect(page.getByLabel("Søk etter saker")).toBeFocused();
    });

    test("ArrowDown navigerer mellom resultater", async ({ page }) => {
      await page.goto("/søk", { waitUntil: "networkidle" });

      await page.getByLabel("Søk etter saker").fill("dagpenger");
      await page.getByLabel("Søk etter saker").press("Enter");

      const artikler = page.getByRole("article");
      const antall = await artikler.count();
      if (antall < 2) return;

      await page.getByLabel("Søk etter saker").press("ArrowDown");
      await page.keyboard.press("ArrowDown");

      const andreLenke = artikler.nth(1).getByRole("link");
      await expect(andreLenke).toBeFocused();
    });
  });

  test.describe("header-søk", () => {
    test("søkefelt i header poster til søkesiden", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      const headerSøk = page.getByRole("search", { name: "Hurtigsøk" }).getByRole("searchbox");
      await headerSøk.fill("101");
      await headerSøk.press("Enter");

      await expect(page).toHaveURL("/søk");
      await expect(page.getByText(/treff for "101"/)).toBeVisible();
    });

    test("Cmd+K fokuserer søkefeltet i header", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      await page.keyboard.press("Meta+k");

      const headerSøk = page.getByRole("search", { name: "Hurtigsøk" }).getByRole("searchbox");
      await expect(headerSøk).toBeFocused();
    });

    test("Cmd+K fokuserer det store søkefeltet på søkesiden", async ({ page }) => {
      await page.goto("/søk", { waitUntil: "networkidle" });

      await page.getByLabel("Søk etter saker").blur();
      await page.keyboard.press("Meta+k");

      await expect(page.getByLabel("Søk etter saker")).toBeFocused();
    });
  });
});
