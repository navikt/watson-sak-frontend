import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Statistikk", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/statistikk", { waitUntil: "networkidle" });
  });

  test("viser overskrift", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Statistikk" })).toBeVisible();
  });

  test("viser nøkkeltall", async ({ page }) => {
    const nøkkeltall = page.getByRole("region", { name: "Nøkkeltall" });
    await expect(nøkkeltall.getByText("Totalt")).toBeVisible();
    await expect(nøkkeltall.getByText("Under utredning")).toBeVisible();
    await expect(nøkkeltall.getByText("Avsluttet")).toBeVisible();
    await expect(nøkkeltall.getByText("Ufordelt")).toBeVisible();
  });

  test("viser saker per status som søylediagram", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Saker per status" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Søylediagram over saker per status/ }),
    ).toBeVisible();
  });

  test("viser behandlingstid med visuell indikator", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Behandlingstid (dager)" })).toBeVisible();
    await expect(page.getByRole("img", { name: /Behandlingstid fra/ })).toBeVisible();
  });

  test("viser saker per seksjon som søylediagram", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Saker per seksjon" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Søylediagram over saker per seksjon/ }),
    ).toBeVisible();
  });

  test("viser fordeling per ytelse som søylediagram", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Fordeling per ytelse" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Søylediagram over fordeling per ytelse/ }),
    ).toBeVisible();
  });

  test("viser fordeling per antall ytelser som søylediagram", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Fordeling per antall ytelser" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Søylediagram over fordeling per antall ytelser/ }),
    ).toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
