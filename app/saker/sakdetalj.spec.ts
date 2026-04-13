import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Sakdetalj", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/saker/101", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /^Sak 101$/ })).toBeVisible();
  });

  test("viser saksinformasjon", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /^Sak 101$/ })).toBeVisible();
    await expect(page.getByText("Personnummer")).toBeVisible();
  });

  test("viser historikk-seksjon", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Historikk" })).toBeVisible();
  });

  test("viser handlingsknapper", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Handlinger" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Tildel saksbehandler" })).toBeVisible();
  });

  test("kan åpne og lukke tildel-modal", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Tildel saksbehandler" })).toBeEnabled();
    await page.getByRole("button", { name: "Tildel saksbehandler" }).click();
    await page.waitForTimeout(300);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Tildel saksbehandler" })).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Saksbehandler" })).toBeVisible();

    // Vent til modal-animasjonen er ferdig før UU-sjekk
    await sjekkTilgjengelighet(page);

    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("viser tilbake-knapp", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Tilbake" })).toBeVisible();
  });

  test("kan redigere saksinformasjon inline", async ({ page }) => {
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();

    await page.getByLabel("Kategori").selectOption("ARBEID");
    await page.getByLabel("Misbruktype").selectOption("Svart arbeid");
    await page.getByLabel("Merking (valgfritt)").selectOption("PRIORITERT");
    await page.getByLabel("Kilde").selectOption("PUBLIKUM");
    await page.getByLabel("Fra dato").fill("01.02.2026");
    await page.getByLabel("Til dato").fill("28.02.2026");

    const ytelserCombobox = page.getByLabel("Ytelse");
    await ytelserCombobox.fill("Dagpenger");
    await page.getByRole("option", { name: "Dagpenger" }).click();
    await ytelserCombobox.fill("Sykepenger");
    await page.getByRole("option", { name: "Sykepenger" }).click();

    await page.getByRole("button", { name: "Lagre" }).click();
    await expect(page.getByRole("button", { name: "Rediger saksinformasjon" })).toBeVisible();

    await expect(page.getByRole("combobox", { name: "Kategori" })).toHaveCount(0);
    await expect(page.getByText("Arbeid", { exact: true })).toBeVisible();
    await expect(page.getByText("Svart arbeid", { exact: true })).toBeVisible();
    await expect(page.getByText("Prioritert", { exact: true })).toBeVisible();
    await expect(page.getByText("Publikum", { exact: true })).toBeVisible();
    await expect(page.getByText("Dagpenger", { exact: true })).toBeVisible();
    await expect(page.getByText("Sykepenger", { exact: true })).toBeVisible();
    await expect(page.getByText("1. feb. 2026 – 28. feb. 2026")).toBeVisible();
    await expect(page.getByText("12345678901")).toBeVisible();
  });

  test("kan avbryte redigering uten å lagre endringer", async ({ page }) => {
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();

    await page.getByLabel("Kategori").selectOption("ARBEID");
    await page.getByRole("button", { name: "Avbryt" }).click();

    await expect(page.getByRole("button", { name: "Rediger saksinformasjon" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Kategori" })).toHaveCount(0);
    await expect(page.getByText("Samliv", { exact: true })).toBeVisible();
    await expect(page.getByText("Arbeid", { exact: true })).toHaveCount(0);
  });

  test("viser ikke status og saksbehandler som redigerbare felt", async ({ page }) => {
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();

    await expect(page.getByRole("combobox", { name: "Status" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Saksbehandler" })).toHaveCount(0);
  });

  test("varsler ved navigering bort med ulagrede endringer", async ({ page }) => {
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();
    await page.getByLabel("Kategori").selectOption("ARBEID");

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.dismiss();
    });

    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page).toHaveURL(/\/saker\/101$/);
  });

  test("varsler ved refresh med ulagrede endringer", async ({ page }) => {
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();
    await page.getByLabel("Kategori").selectOption("ARBEID");

    const dialogPromise = page.waitForEvent("dialog");
    const reloadPromise = page.reload({ waitUntil: "load" });
    const dialog = await dialogPromise;

    expect(dialog.type()).toBe("beforeunload");
    await dialog.accept();
    await reloadPromise;
    await expect(page).toHaveURL(/\/saker\/101$/);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
