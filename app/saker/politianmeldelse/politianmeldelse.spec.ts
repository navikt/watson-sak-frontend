import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Politianmeldelse", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    // Sak 113 har status "under utredning" og finnes unikt i mockdata.
    await page.goto("/saker/113/politianmeldelse", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Opprett politianmeldelse" })).toBeVisible();
  });

  test("viser riktig overskrift og saksinformasjon", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Opprett politianmeldelse" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Saksinformasjon" })).toBeVisible();
  });

  test("viser dokumentvelger og oppsummeringsskjema", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Velg dokumenter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Oppsummering av utredning" })).toBeVisible();
    await expect(page.getByLabel("Funn")).toBeVisible();
    await expect(page.getByLabel("Vurdering")).toBeVisible();
    await expect(page.getByLabel("Anbefaling")).toBeVisible();
  });

  test("viser valideringsfeil ved tom innsending", async ({ page }) => {
    await page.getByRole("button", { name: "Send politianmeldelse" }).click();

    await expect(page.getByText("Du må beskrive funnene dine")).toBeVisible();
    await expect(page.getByText("Du må skrive en vurdering")).toBeVisible();
    await expect(page.getByText("Du må skrive en anbefaling")).toBeVisible();
    await expect(page.getByText("Du må velge minst ett dokument")).toBeVisible();
    await expect(page.getByText("Skjemaet inneholder feil")).toBeVisible();
  });

  test("kan fylle ut og sende inn politianmeldelse", async ({ page }) => {
    const valgtDokument = page.getByRole("checkbox", { name: "Velg Søknad om unntak" }).first();
    await valgtDokument.check();
    await expect(valgtDokument).toBeChecked();

    await page.getByLabel("Funn").fill("Mistanke om svindel med dagpenger");
    await page.getByLabel("Vurdering").fill("Klare tegn på bevisst feilinformasjon");
    await page.getByLabel("Anbefaling").fill("Anbefaler politianmeldelse");

    await page.getByRole("button", { name: "Send politianmeldelse" }).click();

    await expect(page).toHaveURL(/\/saker\/113$/);
  });

  test("avbryt-knappen navigerer tilbake til sak", async ({ page }) => {
    await page.getByRole("button", { name: "Avbryt" }).click();

    await expect(page).toHaveURL(/\/saker\/113$/);
  });

  test("tilbake-knappen navigerer tilbake til sak", async ({ page }) => {
    await page.getByRole("button", { name: "Tilbake til sak" }).click();

    await expect(page).toHaveURL(/\/saker\/113$/);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});

test.describe("Politianmeldelse – tilgang", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
  });

  test("politianmeldelsesiden er tilgjengelig for saker under utredning", async ({ page }) => {
    await page.goto("/saker/113/politianmeldelse");

    await expect(page.getByRole("heading", { name: "Opprett politianmeldelse" })).toBeVisible();
  });

  test("politianmeldelsesiden redirecter for saker med annen status", async ({ page }) => {
    await page.goto("/saker/101/politianmeldelse");

    await expect(page).toHaveURL(/\/saker\/101$/);
  });
});
