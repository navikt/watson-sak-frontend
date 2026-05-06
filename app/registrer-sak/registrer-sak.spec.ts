import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Opprett sak", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/registrer-sak", { waitUntil: "networkidle" });
  });

  test("viser søkefelt med riktig overskrift", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Opprett sak" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" })).toBeVisible();
  });

  test("viser feilmelding ved ugyldig person", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("99999999999");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(page.getByText("Personen ble ikke funnet")).toBeVisible();
  });

  test("viser personinfo og skjema etter vellykket oppslag", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByLabel("Personinformasjon").getByText("Ola Testesen", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();
  });

  test("viser advarsel om eksisterende sak", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("03117845975");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(page.getByText("Det er allerede registrert en sak på personen")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se sak" })).toBeVisible();
  });

  test("kan opprette sak med kun kategori og kilde", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();

    await page.getByLabel("Kategori").selectOption("DOKUMENTFALSK");
    await page.getByLabel("Kilde").selectOption("NAV_KONTROLL");

    await page.getByRole("button", { name: "Opprett sak" }).click();

    await expect(page).toHaveURL(/\/saker\/\d+/);
  });

  test("viser ErrorSummary når påkrevde felter mangler", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Opprett sak" }).click();

    await expect(page.getByText("Du må rette disse feilene før du kan gå videre")).toBeVisible();
  });

  test("kan legge til og fjerne ytelse-rader", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(page.getByRole("heading", { name: "Ytelser med mulig misbruk" })).toBeVisible();

    await page.getByRole("button", { name: "Legg til ytelse" }).click();
    await expect(page.getByLabel("Ytelse")).toHaveCount(2);

    await page.getByRole("button", { name: "Fjern rad 2" }).click();
    await expect(page.getByLabel("Ytelse")).toHaveCount(1);
  });

  test("Avbryt-knappen lenker til landingssiden", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Avbryt" })).toHaveAttribute("href", "/");
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
