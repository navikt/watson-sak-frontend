import { expect, test } from "@playwright/test";

import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Opprett sak", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/registrer-sak", { waitUntil: "networkidle" });
  });

  test("viser søkefelt med riktig overskrift", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Opprett sak" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" })).toBeVisible();
  });

  test("viser feilmelding ved ugyldig person", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("99999999999");
    await page.getByRole("button", { name: "Søk" }).click();

    await expect(page.getByText("Personen ble ikke funnet")).toBeVisible();
  });

  test("viser personinfo og skjema etter vellykket oppslag", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByRole("button", { name: "Søk" }).click();

    await expect(page.getByText("Ola Testesen")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();
  });

  test("viser advarsel om eksisterende sak", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("03117845975");
    await page.getByRole("button", { name: "Søk" }).click();

    await expect(page.getByText("Det er allerede registrert en sak på personen")).toBeVisible();
    await expect(page.getByRole("link", { name: "Se sak" })).toBeVisible();
  });

  test("kan fylle ut og sende inn skjema", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByRole("heading", { name: "Grunnleggende saksinformasjon" }),
    ).toBeVisible();

    await page.getByLabel("Kategori").selectOption("DOKUMENTFALSK");
    await page.getByLabel("Fra dato").fill("01.01.2026");
    await page.getByLabel("Til dato").fill("31.12.2026");

    const ytelserCombobox = page.getByLabel("Ytelse");
    await ytelserCombobox.fill("Dagpenger");
    await page.getByRole("option", { name: "Dagpenger" }).click();

    await page.getByLabel("Enhet").selectOption("ØST");
    await page.getByLabel("Kilde").selectOption("INTERN");

    await page.getByRole("button", { name: "Opprett sak" }).click();

    await expect(page).toHaveURL("/");
  });

  test("misbruktype-feltet vises kun for kategorier med misbrukstyper", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("12345678901");
    await page.getByRole("button", { name: "Søk" }).click();

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
