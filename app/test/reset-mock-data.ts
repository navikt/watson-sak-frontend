import type { Page } from "@playwright/test";

/** Tilbakestiller all mock-data for denne testens isolerte sesjon via API-kall */
export async function resetMockData(page: Page) {
  const response = await page.request.post("/api/reset-mock-data");
  if (!response.ok()) {
    throw new Error(`Klarte ikke tilbakestille mock-data: ${response.status()}`);
  }
}
