import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright-konfigurasjon for Watson Søk
 * Se https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./app",

  /* Kjør kun .spec.ts filer, ikke .test.ts filer (de er for Vitest) */
  testMatch: /.*\.spec\.(ts|tsx)$/,

  /* Kjør tester i filer parallelt */
  fullyParallel: true,

  /* Feil bygget på CI hvis du ved et uhell har lagt igjen test.only i kildekoden. */
  forbidOnly: !!process.env.CI,

  /* Prøv på nytt kun på CI */
  retries: process.env.CI ? 2 : 0,

  /* Deaktiver parallelle tester på CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter å bruke. Se https://playwright.dev/docs/test-reporters */
  reporter: "html",

  /* Delte innstillinger for alle prosjektene nedenfor. Se https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base-URL å bruke i handlinger som `await page.goto('/')`. */
    baseURL: "http://localhost:5173",

    /* Samle trace når feilende test prøves på nytt. Se https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Konfigurer prosjekter for hovednettlesere */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Kjør lokal dev-server før testene starter */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
