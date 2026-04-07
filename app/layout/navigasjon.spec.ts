import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

const sider = [
  { lenketekst: "Dashboard", sti: "/", tittel: /Watson Sak/ },
  { lenketekst: "Mine saker", sti: "/mine-saker", tittel: /Mine saker/ },
  { lenketekst: "Fordeling", sti: "/fordeling", tittel: /Fordeling/ },
  { lenketekst: "Opprett sak", sti: "/registrer-sak", tittel: /Opprett sak/ },
  { lenketekst: "Statistikk", sti: "/statistikk", tittel: /Statistikk/ },
];

test.describe("Navigasjon og sidebar", () => {
  test("sidebar har riktig aria-label", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const nav = page.getByRole("navigation", { name: "Hovedmeny" });
    await expect(nav).toBeVisible();
  });

  for (const side of sider) {
    test(`kan navigere til ${side.lenketekst}`, async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      const nav = page.getByRole("navigation", { name: "Hovedmeny" });
      await nav.getByRole("link", { name: side.lenketekst }).click();

      await expect(page).toHaveURL(side.sti);
      await sjekkTilgjengelighet(page);
    });
  }
});
