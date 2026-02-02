import type { Page } from "@playwright/test";

import { AxeBuilder } from "@axe-core/playwright";
import { expect } from "@playwright/test";

export const sjekkTilgjengelighet = async (page: Page) => {
  const tilgjengelighetsresultater = await new AxeBuilder({ page })
    .include("#maincontent")
    .analyze();

  if (tilgjengelighetsresultater.violations.length > 0) {
    console.error("🚫♿️ Fant UU-feil ♿️🚫");
    console.error(
      JSON.stringify(tilgjengelighetsresultater.violations, null, 2),
    );
  }

  expect(tilgjengelighetsresultater.violations).toEqual([]);
};
