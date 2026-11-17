import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { ventPåHydrering } from "~/test/vent-på-hydrering";

test.describe("Henlegg utredning med notat", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/saker/101", { waitUntil: "networkidle" });
    await ventPåHydrering(page);
    await expect(page.getByRole("heading", { name: /^Sak 101/ })).toBeVisible();
    await page.getByRole("button", { name: "Tildel meg" }).click();
    await expect(page.getByRole("button", { name: "Endre saksinformasjon" })).toBeVisible();
    // Sak 101 står i Opprettet. Notater registreres i Utredning.
    await page.getByRole("button", { name: "Endre steg", exact: true }).click();
    await page.getByRole("button", { name: "Gå til utredning" }).click();
    await expect(page.getByRole("dialog", { name: "Lagret" })).toBeVisible();
    await page
      .getByRole("dialog", { name: "Lagret" })
      .getByRole("button", { name: "Lukk" })
      .last()
      .click();
    await page.getByRole("button", { name: "Endre steg", exact: true }).click();
    await page.getByRole("button", { name: "Henlegg sak" }).click();
    await expect(page.getByRole("dialog", { name: "Henlegg sak" })).toBeVisible();
  });

  test("henlegger med orienteringsnotat, knytter oppgave og viser notatet på saken", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "Ikke kapasitet" }).check();
    await dialog.getByRole("button", { name: "Vis mer" }).click();
    await dialog.getByRole("button", { name: /Skriv notat.*orienteringsnotat/i }).click();
    await dialog.getByRole("textbox", { name: /Tekst i orienteringsnotat/i }).fill("Orientering");
    await expect(dialog.getByRole("checkbox", { name: "Orienteringsnotat" })).toBeChecked();
    await dialog.getByRole("button", { name: "Avslutt sak" }).click();

    await expect(
      dialog.getByText("Orienteringsnotat er arkivert og journalført i Gosys"),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Knytt til oppgave" }).click();
    await expect(
      page.getByRole("dialog", { name: "Knytt oppgave til orienteringsnotat" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Avbryt" }).click();

    await dialog.getByRole("button", { name: "Avslutt sak" }).click();
    await expect(page.getByRole("dialog", { name: "Lagret" })).toBeVisible();
    await page.getByRole("button", { name: "Lukk" }).last().click();

    await expect(page.getByText("Registrert", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("definition").filter({ hasText: "Orienteringsnotat" }),
    ).toBeVisible();
    // Notatet vises i den åpnede Gosys-oversikten uten at siden lastes på nytt.
    await expect(page.getByRole("cell", { name: "Orienteringsnotat" }).first()).toBeVisible();
  });

  test("henlegger uten notat", async ({ page }) => {
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("radio", { name: "Ikke kapasitet" }).check();
    await dialog.getByRole("button", { name: "Avslutt sak" }).click();
    await expect(page.getByRole("dialog", { name: "Avslutt sak" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Avslutt sak" }).click();
    await expect(page.getByRole("dialog", { name: "Lagret" })).toBeVisible();
  });
});
