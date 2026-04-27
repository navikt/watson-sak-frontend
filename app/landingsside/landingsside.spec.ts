import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Landingsside", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/", { waitUntil: "networkidle" });
  });

  test("viser velkomsthilsen med brukerens navn", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /God (morgen|dag|ettermiddag|kveld|natt), Saks/,
      }),
    ).toBeVisible();
  });

  test("viser en dynamisk oppsummeringslinje i velkomstseksjonen", async ({ page }) => {
    await expect(
      page.getByText("Akkurat nå har du 5 aktive saker og 1 sak på vent."),
    ).toBeVisible();
  });

  test("kan skjule velkomstmeldingen via innstillinger og beholder valget etter refresh", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Innstillinger" }).click();

    const preferanseLagret = page.waitForResponse(
      (response) => response.url().includes("/api/preferences") && response.ok(),
    );
    await page.getByRole("checkbox", { name: "Vis velkomstmelding" }).click();
    await preferanseLagret;

    await page.getByRole("button", { name: "Lukk" }).nth(1).click();

    await expect(
      page.getByRole("heading", {
        name: /God (morgen|dag|ettermiddag|kveld|natt), Saks/,
      }),
    ).not.toBeVisible();

    await page.reload({ waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", {
        name: /God (morgen|dag|ettermiddag|kveld|natt), Saks/,
      }),
    ).not.toBeVisible();
  });

  test("kan lukke innstillinger ved å trykke på backdroppet", async ({ page }) => {
    await page.getByRole("button", { name: "Innstillinger" }).click();
    const dialog = page.getByRole("dialog", { name: "Innstillinger" });
    await expect(dialog).toBeVisible();

    const dialogBoks = await dialog.boundingBox();

    expect(dialogBoks).not.toBeNull();

    if (!dialogBoks) {
      throw new Error("Fant ikke dialogen som forventet");
    }

    await page.mouse.click(dialogBoks.x - 20, dialogBoks.y - 20);

    await expect(page.getByRole("heading", { name: "Innstillinger" })).not.toBeVisible();
  });

  test("viser mine saker-oversikt", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Mine saker" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Se alle" })).toBeVisible();
  });

  test("kan markere et varsel som lest", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).toBeVisible();

    await page.getByRole("button", { name: "Marker som lest" }).first().click();

    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).toHaveCount(0);
    await page.reload({ waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Sak #102 har ny hendelse" })).toBeVisible();
  });

  test("viser siste varsler og kan vise flere uleste varsler", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Siste varsler" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Marker som lest" })).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Vis flere" })).toBeVisible();

    await page.getByRole("button", { name: "Vis flere" }).click();

    await expect(page.getByRole("button", { name: "Marker som lest" })).toHaveCount(7);
    await expect(page.getByRole("button", { name: "Vis flere" })).not.toBeVisible();
  });

  test("viser seksjonen for dine saker siste 14 dager ved siden av varslinger på brede skjermer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 1200 });
    await page.reload({ waitUntil: "networkidle" });

    const statistikkSeksjon = page
      .getByRole("heading", { name: "Dine saker siste 14 dager" })
      .locator("xpath=ancestor::section[1]");
    const varslerSeksjon = page
      .getByRole("heading", { name: "Siste varsler" })
      .locator("xpath=ancestor::section[1]");

    await expect(
      statistikkSeksjon.getByRole("heading", { name: "Dine saker siste 14 dager" }),
    ).toBeVisible();
    await expect(statistikkSeksjon.getByText("Behandlet")).toBeVisible();
    await expect(statistikkSeksjon.getByText("Dager behandlingstid, snitt")).toBeVisible();
    await expect(statistikkSeksjon.getByText("Henlagte saker")).toBeVisible();
    await expect(statistikkSeksjon.getByText("Henlagte tips")).toBeVisible();

    const statistikkBoks = await statistikkSeksjon.boundingBox();
    const varslerBoks = await varslerSeksjon.boundingBox();

    expect(statistikkBoks).not.toBeNull();
    expect(varslerBoks).not.toBeNull();

    if (!statistikkBoks || !varslerBoks) {
      throw new Error("Fant ikke seksjonsboksene som forventet");
    }

    expect(Math.abs(statistikkBoks.y - varslerBoks.y)).toBeLessThan(10);
    expect(varslerBoks.x).toBeLessThan(statistikkBoks.x);
    expect(Math.abs(varslerBoks.width - statistikkBoks.width)).toBeLessThan(20);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
