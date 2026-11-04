import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { ventPåHydrering } from "~/test/vent-på-hydrering";

/**
 * Lagringsfeil i dokumenteditoren: meldingen vises også ved nettverksbrudd, og «Prøv igjen»
 * lagrer de samme endringene uten at brukeren må skrive noe nytt.
 */
test.describe("Lagringsfeil i dokumenteditoren", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    // Sak 1011 er i utredning og eies av innlogget bruker, så dokumenter kan redigeres.
    // Saken har ingen dokumenter, så testen lager et blankt dokument.
    await page.goto("/saker/1011", { waitUntil: "networkidle" });
    await ventPåHydrering(page);
    await page.getByRole("button", { name: "Opprett dokument" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /Blankt dokument/ })
      .click();
    await page.waitForURL(/\/saker\/1011\/dokumenter\//);
    await ventPåHydrering(page);
  });

  test("viser feilmelding ved nettverksbrudd og lagrer på nytt med «Prøv igjen»", async ({
    page,
  }) => {
    let brutt = true;
    await page.route("**/api/saker/*/dokumenter/*/lagre", async (route) => {
      if (brutt) await route.abort("internetdisconnected");
      else await route.continue();
    });

    const editor = page.getByRole("textbox", { name: "Dokumentinnhold" });
    await editor.click();
    await page.keyboard.type(" Ny tekst");

    const melding = page.getByRole("alert").filter({ hasText: "Vi fikk ikke lagret dokumentet" });
    await expect(melding).toBeVisible();
    // Ved nettverksbrudd svarte ikke serveren, så det finnes ingen feil-ID.
    await expect(melding).not.toContainText("feil-ID");

    brutt = false;
    const lagret = page.waitForResponse(
      (svar) => svar.url().includes("/lagre") && svar.request().method() === "PUT" && svar.ok(),
    );
    await melding.getByRole("button", { name: "Prøv igjen" }).click();
    await lagret;

    await expect(melding).toHaveCount(0);
    await expect(editor).toContainText("Ny tekst");
  });
});
