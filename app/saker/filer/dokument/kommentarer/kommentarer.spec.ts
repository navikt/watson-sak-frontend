import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

/**
 * Kritisk E2E-flyt for dokumentkommentarer: åpne panelet via dyplenke, lese
 * eksisterende kommentarer, legge til en ny generell kommentar og løse en tråd.
 */
test.describe("Dokumentkommentarer", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    // Sak 102 har seedede dokumenter, og dokument 1-1 har seedede kommentarer.
    await page.goto("/saker/102", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Tildel meg" }).click();
    await expect(page.getByRole("button", { name: "Rediger saksinformasjon" })).toBeVisible();

    await page.goto("/saker/102/dokumenter/1-1?sidepanel=kommentarer", {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("heading", { name: "Kommentarer" })).toBeVisible();
  });

  test("viser uløste kommentarer og skjuler løste som standard", async ({ page }) => {
    await expect(page.getByText("Bør vi presisere hva slags dokument dette er?")).toBeVisible();
    await expect(
      page.getByText("Husk å gå gjennom hele dokumentet før journalføring."),
    ).toBeVisible();

    // Den løste tråden er skjult til man slår den på.
    await expect(
      page.getByText("Dette avsnittet kan fjernes før vi sender rapporten."),
    ).toHaveCount(0);

    await page.getByLabel("Vis løste (1)").click();
    await expect(
      page.getByText("Dette avsnittet kan fjernes før vi sender rapporten."),
    ).toBeVisible();
  });

  test("markerer forankret tekst i dokumentet", async ({ page }) => {
    await expect(page.locator("mark[data-kommentartraad]").first()).toBeVisible();
  });

  test("kan legge til en generell kommentar", async ({ page }) => {
    await page.getByRole("button", { name: "Ny kommentar" }).click();
    await page.getByLabel("Kommentar").fill("Ny kommentar fra e2e-testen");
    await page.getByRole("button", { name: "Legg til kommentar" }).click();

    await expect(page.getByText("Ny kommentar fra e2e-testen")).toBeVisible();

    // Kommentaren overlever en ny innlasting av siden.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("Ny kommentar fra e2e-testen")).toBeVisible();
  });

  test("kan svare på og løse en kommentartråd", async ({ page }) => {
    const traad = page.getByRole("article", { name: "Kari Hansen" });

    await traad.getByRole("button", { name: "Svar" }).click();
    await traad.getByLabel("Svar på kommentaren").fill("Ja, vi presiserer det.");
    await traad.getByRole("button", { name: "Svar", exact: true }).click();
    await expect(page.getByText("Ja, vi presiserer det.")).toBeVisible();

    await traad.getByRole("button", { name: "Marker som løst" }).click();
    await expect(page.getByText("Bør vi presisere hva slags dokument dette er?")).toHaveCount(0);

    await page.getByLabel("Vis løste (2)").click();
    await expect(page.getByText("Bør vi presisere hva slags dokument dette er?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Gjenåpne" }).first()).toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
