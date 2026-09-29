import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Mapper i Filer", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    // Sak 1011 er i utredning og eies av innlogget bruker, så filene kan redigeres.
    await page.goto("/saker/1011", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /^Sak 1011/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Opprett mappe" })).toBeVisible();
  });

  async function opprettMappe(page: import("@playwright/test").Page, navn: string) {
    await page.getByRole("button", { name: "Opprett mappe" }).click();
    const dialog = page.getByRole("dialog", { name: "Opprett mappe" });
    await dialog.getByRole("textbox", { name: "Mappenavn" }).fill(navn);
    await dialog.getByRole("button", { name: "Opprett mappe" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: new RegExp(`^${navn}`) })).toBeVisible();
  }

  test("kan opprette mapper og dra en mappe inn i en annen", async ({ page }) => {
    await opprettMappe(page, "Alfa");
    await opprettMappe(page, "Beta");

    const beta = page.getByRole("button", { name: /^Beta/ });
    const alfa = page.getByRole("button", { name: /^Alfa/ });
    await beta.dragTo(alfa);

    const alfaInnhold = page.getByRole("list", { name: "Alfa" });
    await expect(alfaInnhold.getByRole("button", { name: /^Beta/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Alfa/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("kan flytte en mappe tilbake til rotnivå fra menyen", async ({ page }) => {
    await opprettMappe(page, "Alfa");
    await page.getByRole("button", { name: "Opprett mappe" }).click();
    const opprett = page.getByRole("dialog", { name: "Opprett mappe" });
    await opprett.getByRole("textbox", { name: "Mappenavn" }).fill("Beta");
    await opprett.getByRole("combobox", { name: "Plassering" }).selectOption("Alfa");
    await opprett.getByRole("button", { name: "Opprett mappe" }).click();
    await expect(opprett).toBeHidden();

    await page.getByRole("button", { name: /^Alfa/ }).click();
    await page.getByRole("button", { name: "Handlinger for mappen Beta" }).click();
    await page.getByRole("menuitem", { name: "Flytt til …" }).click();
    const flytt = page.getByRole("dialog", { name: "Flytt «Beta»" });
    await flytt.getByRole("combobox", { name: "Flytt til" }).selectOption({ label: "Rotnivå" });
    await flytt.getByRole("button", { name: "Flytt" }).click();
    await expect(flytt).toBeHidden();

    await expect(page.getByRole("list", { name: "Alfa" }).getByText("Mappen er tom")).toBeVisible();
  });

  test("er UU-compliant med mapper", async ({ page }) => {
    await opprettMappe(page, "Alfa");
    await page.getByRole("button", { name: /^Alfa/ }).click();
    await sjekkTilgjengelighet(page);
  });
});
