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

    await expect(page.getByText("Ola Testesen")).toBeVisible();
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

  test("kan fylle ut og sende inn skjema", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();

    await page.getByLabel("Kategori").selectOption("DOKUMENTFALSK");
    await page.getByLabel("Fra dato").fill("01.01.2024");
    await page.getByLabel("Til dato").fill("31.12.2024");

    const ytelserCombobox = page.getByLabel("Ytelse");
    await ytelserCombobox.fill("Dagpenger");
    await page.getByRole("option", { name: "Dagpenger" }).click();

    await page.getByLabel("Enhet").selectOption("ØST");
    await page.getByLabel("Kilde").selectOption("NAV_KONTROLL");

    await page.getByRole("button", { name: "Opprett sak" }).click();

    await expect(page).toHaveURL(/\/saker\/\d+/);
  });

  test("nyopprettet sak blir søkbar", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();

    await page.getByLabel("Kategori").selectOption("DOKUMENTFALSK");
    await page.getByLabel("Fra dato").fill("01.01.2024");
    await page.getByLabel("Til dato").fill("31.12.2024");

    const ytelserCombobox = page.getByLabel("Ytelse");
    await ytelserCombobox.fill("Dagpenger");
    await page.getByRole("option", { name: "Dagpenger" }).click();

    await page.getByLabel("Enhet").selectOption("ØST");
    await page.getByLabel("Kilde").selectOption("NAV_KONTROLL");

    await page.getByRole("button", { name: "Opprett sak" }).click();
    await expect(page).toHaveURL(/\/saker\/\d+/);

    await page.goto("/søk", { waitUntil: "networkidle" });
    await page.getByLabel("Søk etter saker").fill("12345678901");
    await page.getByLabel("Søk etter saker").press("Enter");

    await expect(page.getByText(/treff for "12345678901"/)).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("misbruktype-feltet vises kun for kategorier med misbrukstyper", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();

    // Velg kategori uten misbrukstyper
    await page.getByLabel("Kategori").selectOption("DOKUMENTFALSK");
    await expect(page.getByLabel("Misbruktype")).not.toBeVisible();

    // Velg kategori med misbrukstyper
    await page.getByLabel("Kategori").selectOption("SAMLIV");
    await expect(page.getByLabel("Misbruktype")).toBeVisible();
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});
