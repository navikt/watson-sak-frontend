import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Mine saker", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/mine-saker", { waitUntil: "networkidle" });
  });

  test("viser saksliste med statusfiltre", async ({ page }) => {
    const hovedinnhold = page.locator("#maincontent");

    await expect(page.getByRole("heading", { name: "Mine saker" })).toBeVisible();
    await expect(hovedinnhold.getByLabel("Filtrer saker")).toBeVisible();
    const lenker = hovedinnhold.getByRole("link");
    await expect(lenker.first()).toBeVisible();
    expect(await lenker.count()).toBeGreaterThan(5);
  });

  test("kan filtrere på ventestatus for å vise ventende saker", async ({ page }) => {
    const hovedinnhold = page.locator("#maincontent");

    const antallFør = await hovedinnhold.getByRole("link").count();
    // Klikk «Venter på vedtak» for å inkludere ventende saker
    await hovedinnhold.getByRole("button", { name: "Venter på vedtak" }).click();
    const antallEtter = await hovedinnhold.getByRole("link").count();
    expect(antallEtter).toBeGreaterThanOrEqual(antallFør);
  });

  test("beholder filter ved fanebytte og åpner en sak", async ({ page }) => {
    const hovedinnhold = page.locator("#maincontent");
    const ventestatus = hovedinnhold.getByRole("button", { name: "Venter på vedtak" });

    await ventestatus.click();
    await expect(ventestatus).toHaveAttribute("aria-pressed", "true");

    await hovedinnhold.getByRole("tab", { name: /Delt med meg/ }).click();
    await expect(page).toHaveURL(/fane=delt/);
    await expect(hovedinnhold.getByLabel("Filtrer saker")).toBeVisible();
    await expect(hovedinnhold.getByRole("button", { name: "Venter på vedtak" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Mockdata har ingen saker delt med testbrukeren, så åpne en sak etter å ha gått tilbake til Mine saker.
    await hovedinnhold.getByRole("tab", { name: /Mine saker/ }).click();
    const sakLenke = hovedinnhold.getByRole("link", { name: /^#\d+$/ }).first();
    await expect(sakLenke).toBeVisible();
    await sakLenke.click();
    await expect(page).toHaveURL(/\/saker\/\d+/);
  });

  test("kan navigere til sakdetalj", async ({ page }) => {
    const sakLenke = page.locator("#maincontent").getByRole("link").first();

    await expect(sakLenke).toBeVisible();
    await sakLenke.click();
    await expect(page).toHaveURL(/\/saker\/\d+/);
  });

  test("er UU-compliant", async ({ page }) => {
    await page.waitForLoadState("networkidle");
    await sjekkTilgjengelighet(page);
  });
});
