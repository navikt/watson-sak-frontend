import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Landingsside", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("viser velkomsthilsen med brukerens navn", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /God (morgen|dag|ettermiddag|kveld|natt), Saks/,
      }),
    ).toBeVisible();
  });

  test("viser nøkkeltall", async ({ page }) => {
    const nøkkeltall = page.getByRole("region", { name: "Nøkkeltall" });
    await expect(nøkkeltall.getByText("Totalt antall saker")).toBeVisible();
    await expect(nøkkeltall.getByText("Tips mottatt")).toBeVisible();
    await expect(nøkkeltall.getByText("Under utredning")).toBeVisible();
    await expect(nøkkeltall.getByText("Avsluttet")).toBeVisible();
  });

  test("viser mine saker-oversikt", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Mine saker" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Se alle" })).toBeVisible();
  });

  test("viser prioriterte saker", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Krever handling" })).toBeVisible();
  });

  test("viser hurtiglenker", async ({ page }) => {
    const hurtiglenker = page.getByRole("region", { name: "Hurtiglenker" });
    await expect(hurtiglenker).toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
