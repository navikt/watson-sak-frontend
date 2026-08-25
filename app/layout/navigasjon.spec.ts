import { expect, test } from "@playwright/test";

const sider = [
  {
    lenketekst: "Oversikt",
    sti: "/",
    overskrift: /God (morgen|dag|ettermiddag|kveld|natt), Saks/,
  },
  { lenketekst: "Mine saker", sti: "/mine-saker", overskrift: "Mine saker" },
  { lenketekst: "Ufordelte saker", sti: "/fordeling", overskrift: "Ufordelte saker" },
  { lenketekst: "Alle saker", sti: "/alle-saker", overskrift: "Alle saker" },
  { lenketekst: "Opprett sak", sti: "/registrer-sak", overskrift: "Opprett sak" },
  { lenketekst: "Statistikk", sti: "/statistikk", overskrift: "Statistikk" },
];

test.describe("Navigasjon og sidebar", () => {
  test("kan navigere mellom hovedsidene fra sidebar", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    const nav = page.getByRole("navigation", { name: "Hovedmeny" });
    await expect(nav).toBeVisible();

    for (const side of sider) {
      await nav.getByRole("link", { name: side.lenketekst }).click();

      await expect(page).toHaveURL(side.sti);
      await expect(page.getByRole("heading", { name: side.overskrift }).first()).toBeVisible();
    }
  });
});
