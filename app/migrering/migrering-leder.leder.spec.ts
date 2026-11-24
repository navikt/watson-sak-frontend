import { expect, test } from "@playwright/test";
import { resetMockData } from "~/test/reset-mock-data";

// Kjører mot dev-serveren med lederprofil (se `leder`-prosjektet i playwright.config.ts).
test.describe("Flytt fra Access for leder", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/migrering");
    // Filter og modal er klientkode, så vent til siden er hydrert.
    await page.waitForLoadState("networkidle");
  });

  test("viser én samlet liste med saksbehandler, og personnummer på alle saker", async ({
    page,
  }) => {
    await expect(page.getByRole("table")).toHaveCount(1);
    for (const kolonne of [
      "PID",
      "Fødsels- eller d-nummer",
      "Opprettet i Access",
      "Status",
      "Saksbehandler",
    ]) {
      await expect(page.getByRole("columnheader", { name: kolonne })).toBeVisible();
    }

    const egen = page.getByRole("row", { name: /100388/ });
    await expect(egen).toContainText("345678 90123");
    await expect(egen).toContainText("Ove Overordnerud");

    const andres = page.getByRole("row", { name: /700002/ });
    await expect(andres).toContainText("Trine Trygdesen");
    await expect(andres).toContainText("997000 02999");
    await expect(
      page.getByRole("button", { name: "Flytt sak med PID 700002 fra Access" }),
    ).toHaveCount(0);
  });

  test("filtrerer på saksbehandler og status", async ({ page }) => {
    await page.getByLabel("Saksbehandler").selectOption({ label: "Trine Trygdesen" });
    await expect(page).toHaveURL(/ansvarlig=L900003/);
    await expect(page.getByRole("row", { name: /700002/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /700004/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /700001/ })).toHaveCount(0);

    await page.getByLabel("Saksbehandler").selectOption({ label: "Alle" });
    await expect(page).not.toHaveURL(/ansvarlig=/);
    await expect(page.getByRole("row", { name: /700001/ })).toBeVisible();
    await page.getByRole("group", { name: "Status" }).getByText("Under flytting").click();
    await expect(page).toHaveURL(/status=UNDER_MIGRERING/);
    await expect(page.getByRole("row", { name: /700001/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /700002/ })).toHaveCount(0);
  });

  test("tilbyr Endre tildeling bare på saker som ikke er startet", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: "Endre tildeling for PID 700002" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Endre tildeling for PID 100388" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Endre tildeling for PID 700001" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Endre tildeling for PID 700003" })).toHaveCount(
      0,
    );
  });

  test("lar lederen flytte en sak til en annen saksbehandler", async ({ page }) => {
    await page.getByRole("button", { name: "Endre tildeling for PID 700002" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Endre tildeling for PID 700002",
    });
    await dialog.getByLabel("Enhet").selectOption({ label: "Øst" });
    await dialog.getByRole("combobox", { name: "Ny saksbehandler" }).fill("Ulrikke");
    await dialog.getByRole("option", { name: /Ulrikke Utrederson/ }).click();
    await dialog.getByRole("button", { name: "Lagre" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("row", { name: /700002/ })).toContainText("Ulrikke Utrederson");
  });

  test("lar lederen flytte en sak til en saksbehandler i en annen enhet", async ({ page }) => {
    await page.getByRole("button", { name: "Endre tildeling for PID 700002" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Enhet").selectOption({ label: "Nord" });
    await dialog.getByRole("combobox", { name: "Ny saksbehandler" }).fill("Nora");
    await dialog.getByRole("option", { name: /Nora Nordli/ }).click();
    await dialog.getByRole("button", { name: "Lagre" }).click();

    await expect(dialog).toHaveCount(0);
    // Saken ligger nå hos noen utenfor lederens ansatte og forsvinner fra listen.
    await expect(page.getByRole("row", { name: /700002/ })).toHaveCount(0);
  });

  test("lar lederen tildele sin egen sak til en ansatt", async ({ page }) => {
    await page.getByRole("button", { name: "Endre tildeling for PID 100388" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Enhet").selectOption({ label: "Vest" });
    await dialog.getByRole("combobox", { name: "Ny saksbehandler" }).fill("Vilde");
    await dialog.getByRole("option", { name: /Vilde Vestby/ }).click();
    await dialog.getByRole("button", { name: "Lagre" }).click();

    await expect(dialog).toHaveCount(0);
    const rad = page.getByRole("row", { name: /100388/ });
    await expect(rad).toContainText("Vilde Vestby");
  });
});
