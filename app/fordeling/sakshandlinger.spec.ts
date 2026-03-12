import { expect, test } from "@playwright/test";

test.describe("Fordeling – sakshandlinger", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/fordeling", { waitUntil: "networkidle" });
  });

  test("kan åpne handlingsmenyen med riktige valg", async ({ page }) => {
    await page.getByRole("button", { name: "Handlinger" }).first().click();

    await expect(page.getByRole("menuitem", { name: "Tildel saksbehandler" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Videresend til seksjon" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Henlegg" })).toBeVisible();
  });

  test("kan åpne tildel-modal fra handlingsmenyen", async ({ page }) => {
    await page.getByRole("button", { name: "Handlinger" }).first().click();
    await page.getByRole("menuitem", { name: "Tildel saksbehandler" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Tildel saksbehandler" })).toBeVisible();

    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("kan åpne henlegg-modal fra handlingsmenyen", async ({ page }) => {
    await page.getByRole("button", { name: "Handlinger" }).first().click();
    await page.getByRole("menuitem", { name: "Henlegg" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Henlegg sak" })).toBeVisible();

    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).not.toBeVisible();
  });
});
