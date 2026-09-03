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
      page.getByText("Akkurat nå har du 28 aktive saker og 1 sak på vent."),
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
    await expect(page.getByRole("heading", { name: "Sist aktive saker" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Se alle saker" })).toBeVisible();
  });

  test("kan markere et varsel som lest", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).toBeVisible();

    await page.getByRole("button", { name: "Marker som lest" }).first().click();

    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).toHaveCount(0);
    await page.reload({ waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "Sak #103 må vurderes" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Sak #102 har ny hendelse" })).toBeVisible();
  });

  test("viser maks to siste varsler side ved side fra md-bredde", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 1200 });
    await page.reload({ waitUntil: "networkidle" });

    const varslerSeksjon = page
      .getByRole("heading", { name: "Siste varsler" })
      .locator("xpath=ancestor::section[1]");

    await expect(varslerSeksjon).toBeVisible();
    await expect(varslerSeksjon.getByRole("button", { name: "Marker som lest" })).toHaveCount(2);
    await expect(varslerSeksjon.getByRole("link", { name: "Se alle varsler" })).toBeVisible();

    const varsler = varslerSeksjon.getByRole("heading", { name: /Sak #\d+/ });
    const førsteBoks = await varsler.nth(0).boundingBox();
    const andreBoks = await varsler.nth(1).boundingBox();

    expect(førsteBoks).not.toBeNull();
    expect(andreBoks).not.toBeNull();

    if (!førsteBoks || !andreBoks) {
      throw new Error("Fant ikke varselboksene som forventet");
    }

    expect(Math.abs(førsteBoks.y - andreBoks.y)).toBeLessThan(10);
    expect(førsteBoks.x).toBeLessThan(andreBoks.x);
  });

  test("viser seksjonene i riktig rekkefølge: varsler før sist aktive saker", async ({ page }) => {
    const varslerSeksjon = page
      .getByRole("heading", { name: "Siste varsler" })
      .locator("xpath=ancestor::section[1]");
    const sisteSakerSeksjon = page
      .getByRole("heading", { name: "Sist aktive saker" })
      .locator("xpath=ancestor::section[1]");

    const [varslerHandle, sisteSakerHandle] = await Promise.all([
      varslerSeksjon.elementHandle(),
      sisteSakerSeksjon.elementHandle(),
    ]);

    expect(varslerHandle).not.toBeNull();
    expect(sisteSakerHandle).not.toBeNull();

    if (!varslerHandle || !sisteSakerHandle) {
      throw new Error("Fant ikke seksjonene som forventet");
    }

    const varslerKommerFørst = await page.evaluate(
      ([varslerNode, sisteSakerNode]) =>
        Boolean(
          varslerNode.compareDocumentPosition(sisteSakerNode) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      [varslerHandle, sisteSakerHandle] as const,
    );

    expect(varslerKommerFørst).toBe(true);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
