import { AxeBuilder } from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { ventPåHydrering } from "~/test/vent-på-hydrering";

const feiloverskrifter = {
  historikk: "Vi fikk ikke hentet historikken for saken",
  filer: "Vi fikk ikke hentet filene på saken",
  saksbehandlere: "Vi fikk ikke hentet saksbehandlerne",
  tillatteHandlinger: "Vi fikk ikke hentet handlingene du kan gjøre på saken",
  andreSaker: "Vi fikk ikke hentet andre saker på personen",
} as const;

type Seksjon = keyof typeof feiloverskrifter;

async function åpneSakMedSeksjonsfeil(page: Page, seksjoner: Seksjon[]) {
  await resetMockData(page);
  const søkeparametere = seksjoner.map((seksjon) => `mockFeil=${seksjon}`).join("&");
  await page.goto(`/saker/101?${søkeparametere}`, { waitUntil: "networkidle" });
  await ventPåHydrering(page);
  await expect(page.getByRole("heading", { name: /^Sak 101/ })).toBeVisible();
  // Tildeling gir innlogget bruker tilgang til historikken, slik at testen dekker teknisk feil.
  await page.getByRole("button", { name: "Tildel meg" }).click();
  await expect(page.getByRole("button", { name: "Endre saksinformasjon" })).toBeVisible();
}

async function forventFeilmelding(page: Page, tittel: string) {
  const feilmelding = page
    .getByRole("alert")
    .filter({ has: page.getByRole("heading", { name: tittel }) });
  await expect(feilmelding.getByRole("heading", { name: tittel })).toBeVisible();
  await expect(feilmelding.getByText("Feilen er registrert hos oss.")).toBeVisible();
  await expect(feilmelding.getByText("mock0001", { exact: true })).toBeVisible();
  await expect(feilmelding.getByRole("button", { name: "Prøv igjen" })).toBeVisible();
}

test.describe("Kontekstuelle feilmeldinger på sakssiden", () => {
  test("viser historikkfeil i sidepanelet mens resten av saken vises", async ({ page }) => {
    await åpneSakMedSeksjonsfeil(page, ["historikk"]);

    await forventFeilmelding(page, feiloverskrifter.historikk);
    await expect(page.getByRole("heading", { name: "Filer", exact: true })).toBeVisible();
  });

  test("viser filfeil i stedet for kortet for manglende tilgang", async ({ page }) => {
    await åpneSakMedSeksjonsfeil(page, ["filer"]);

    await forventFeilmelding(page, feiloverskrifter.filer);
    await expect(page.getByRole("heading", { name: "Dokumenter og vedlegg" })).toHaveCount(0);
  });

  test("viser feil for tillatte handlinger uten knapp for å endre steg", async ({ page }) => {
    await åpneSakMedSeksjonsfeil(page, ["tillatteHandlinger"]);

    await forventFeilmelding(page, feiloverskrifter.tillatteHandlinger);
    await expect(page.getByRole("button", { name: "Endre steg", exact: true })).toHaveCount(0);
  });

  test("er UU-compliant med flere seksjonsfeil samtidig", async ({ page }) => {
    const seksjoner = Object.keys(feiloverskrifter) as Seksjon[];
    await åpneSakMedSeksjonsfeil(page, seksjoner);

    for (const seksjon of seksjoner) {
      await forventFeilmelding(page, feiloverskrifter[seksjon]);
    }

    const tilgjengelighetsresultater = await new AxeBuilder({ page }).include("main").analyze();

    if (tilgjengelighetsresultater.violations.length > 0) {
      console.error("🚫♿️ Fant UU-feil ♿️🚫");
      console.error(JSON.stringify(tilgjengelighetsresultater.violations, null, 2));
    }

    expect(tilgjengelighetsresultater.violations).toEqual([]);
  });
});
