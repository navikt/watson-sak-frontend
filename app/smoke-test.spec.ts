import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test("appen laster", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Watson Sak/);

  await sjekkTilgjengelighet(page);
});
