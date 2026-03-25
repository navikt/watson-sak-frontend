import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Registrer sak", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/registrer-sak", { waitUntil: "networkidle" });
  });

  test("viser skjema med riktig overskrift", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Registrer sak" })).toBeVisible();
  });

  test("viser valideringsfeil ved tom innsending", async ({ page }) => {
    await page.getByRole("button", { name: "Registrer sak" }).click();

    await expect(page.getByText("Fødselsnummer er påkrevd")).toBeVisible();
    await expect(page.getByText("Fra dato er påkrevd")).toBeVisible();
    await expect(page.getByText("Til dato er påkrevd")).toBeVisible();
    await expect(page.locator(".aksel-error-message").getByText("Velg kategori")).toBeVisible();
    await expect(page.locator(".aksel-error-message").getByText("Velg prioritet")).toBeVisible();
    await expect(page.getByText("Velg minst én ytelse")).toBeVisible();
    await expect(page.getByText("Bakgrunn er påkrevd")).toBeVisible();
  });

  test("kan fylle ut og sende inn skjema", async ({ page }) => {
    await page.getByLabel("Fødselsnummer").fill("12345678901");
    await page.getByLabel("Kategori").selectOption("UDEFINERT");
    await page.getByLabel("Prioritet").selectOption("HØY");
    await page.getByLabel("Fra dato").fill("01.01.2026");
    await page.getByLabel("Til dato").fill("31.12.2026");

    const ytelserCombobox = page.getByLabel("Ytelser");
    await ytelserCombobox.fill("Dagpenger");
    await page.getByRole("option", { name: "Dagpenger" }).click();

    await page.getByLabel("Kilde").selectOption("INTERN");
    await page.getByLabel("Bakgrunn").fill("En testbeskrivelse av saken");

    await page.getByRole("button", { name: "Registrer sak" }).click();

    await expect(page).toHaveURL("/");
  });

  test("avbryt-knappen navigerer bort fra skjemaet", async ({ page }) => {
    await page.getByRole("button", { name: "Avbryt" }).click();

    await expect(page).not.toHaveURL(/registrer-sak/);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
