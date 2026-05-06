import type { Page } from "@playwright/test";
import { medMockDataLock } from "./mock-data-lock";

/** Tilbakestiller all mock-data til opprinnelig tilstand via API-kall */
export async function resetMockData(page: Page) {
  await medMockDataLock(async () => {
    const response = await page.request.post("/api/reset-mock-data");
    if (!response.ok()) {
      throw new Error(`Klarte ikke tilbakestille mock-data: ${response.status()}`);
    }
  });
}
