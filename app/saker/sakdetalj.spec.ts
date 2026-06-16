import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Sakdetalj", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/saker/101", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /^Sak 101/ })).toBeVisible();
    // Tildel saken til innlogget bruker for å aktivere redigeringsknapper
    await page.getByRole("button", { name: "Tildel meg" }).click();
    await expect(page.getByRole("button", { name: "Rediger saksinformasjon" })).toBeVisible();
  });

  test("kan åpne og lukke endre-ansvarlig-modal", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeEnabled();
    await page.getByRole("button", { name: "Endre ansvarlig saksbehandler" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Endre ansvarlig saksbehandler" }),
    ).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Saksbehandler" })).toBeVisible();

    // Vent til modal-animasjonen er ferdig før UU-sjekk
    await sjekkTilgjengelighet(page);

    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("kan redigere saksinformasjon inline", async ({ page }) => {
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();

    await page.getByLabel("Kategori").selectOption("ARBEID");

    const misbruktypeCombobox = page.getByLabel("Misbruktype");
    await misbruktypeCombobox.click();
    await page.getByRole("option", { name: "Svart arbeid" }).click();
    await misbruktypeCombobox.press("Escape");

    const merkingCombobox = page.getByLabel("Merking");
    await merkingCombobox.click();
    await page.getByRole("option", { name: "Lime" }).click();
    await merkingCombobox.press("Escape");

    await page.getByLabel("Kilde").selectOption("PUBLIKUM");

    const ytelseCombobox = page.getByLabel("Ytelse").first();
    await ytelseCombobox.click();
    await page.getByRole("option", { name: "Dagpenger" }).click();
    await ytelseCombobox.press("Escape");

    await page.getByLabel("Fra", { exact: true }).fill("01.02.2026");
    await page.getByLabel("Til", { exact: true }).fill("28.02.2026");

    await page.getByRole("button", { name: "Lagre" }).click();
    await expect(page.getByRole("button", { name: "Rediger saksinformasjon" })).toBeVisible();

    await expect(page.getByRole("combobox", { name: "Kategori" })).toHaveCount(0);
    await expect(page.getByText("Arbeid", { exact: true })).toBeVisible();
    await expect(page.getByText("Svart arbeid", { exact: true })).toBeVisible();
    await expect(page.getByText("Lime", { exact: true })).toBeVisible();
    await expect(page.getByText("Publikum", { exact: true })).toBeVisible();
    await expect(page.getByText("Dagpenger", { exact: true })).toBeVisible();
    await expect(page.getByText("01.02.2026 – 28.02.2026")).toBeVisible();
    await expect(page.getByText("12345678901").first()).toBeVisible();
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

  test("kan endre status og arbeidsstatus i samlet dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Endre status" }).click();

    const dialog = page.getByRole("dialog", { name: "Endre status" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("radio", { name: "Anmeldt" }).click();
    await dialog.getByRole("radio", { name: "Venter på informasjon" }).click();
    await dialog.getByRole("button", { name: "Lagre" }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".aksel-tag", { hasText: "Anmeldt" })).toBeVisible();
    await expect(page.locator(".aksel-tag", { hasText: "Venter på informasjon" })).toBeVisible();
  });

  test("krever henleggelsesårsak når status settes til henlagt", async ({ page }) => {
    await page.getByRole("button", { name: "Endre status" }).click();

    const dialog = page.getByRole("dialog", { name: "Endre status" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("radio", { name: "Henlagt" }).click();
    await dialog.getByRole("button", { name: "Lagre" }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Henleggelsesårsak")).toBeVisible();
  });

  test("resetter datofelter etter avbryt og ny redigering", async ({ page }) => {
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();

    await page.getByLabel("Fra", { exact: true }).fill("01.02.2026");
    await page.getByLabel("Til", { exact: true }).fill("28.02.2026");
    await page.getByRole("button", { name: "Avbryt" }).click();

    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();

    await expect(page.getByLabel("Fra", { exact: true })).toHaveValue("13.01.2026");
    await expect(page.getByLabel("Til", { exact: true })).toHaveValue("13.01.2026");
  });

  test("viser ikke gamle valideringsfeil etter avbryt og ny redigering", async ({ page }) => {
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();

    await page.getByLabel("Kilde").selectOption("");
    await page.getByRole("button", { name: "Lagre" }).click();

    await expect(page.locator(".aksel-error-message", { hasText: "Velg kilde" })).toBeVisible();

    await page.getByRole("button", { name: "Avbryt" }).click();
    await page.getByRole("button", { name: "Rediger saksinformasjon" }).click();

    await expect(page.locator(".aksel-error-message", { hasText: "Velg kilde" })).toHaveCount(0);
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
