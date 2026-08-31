import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Opprett sak", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/registrer-sak", { waitUntil: "networkidle" });
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

  test("viser advarsel i personkortet om historisk ident og oppretter saken på gjeldende ident", async ({
    page,
  }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("10987654321");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page
        .getByLabel("Personinformasjon")
        .getByText("Fødsels- eller d-nummeret du søkte med er historisk."),
    ).toBeVisible();
    await expect(
      page.getByLabel("Personinformasjon").getByText("Ola Testesen", { exact: true }),
    ).toBeVisible();

    // Skjult personIdent-input (brukes ved saksopprettelse) skal peke på gjeldende ident,
    // ikke den historiske identen det ble søkt med.
    await expect(page.locator('input[name="personIdent"]')).toHaveValue("12345678901");
  });

  test("viser advarsel om eksisterende sak", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("03117845975");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(page.getByText("Det er allerede registrert en sak på personen")).toBeVisible();
    await expect(page.getByRole("button", { name: "Se sak" })).toHaveCount(0);
  });

  test("sperrer skjemaet for skjermet person uten tilgang til å opprette sak", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Fødsels- eller d-nummer" }).fill("44556677001");
    await page.getByLabel("Søk etter person").getByRole("button", { name: "Søk" }).click();

    await expect(
      page.getByLabel("Personinformasjon").getByText("Skjermet Testesen", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Denne personen er skjermet.")).toBeVisible();
    await expect(page.getByText("Du kan ikke opprette sak på denne personen")).toBeVisible();

    // Skjemaet skal ikke rendres i det hele tatt — saksbehandler skal ikke kunne fylle
    // ut eller sende inn skjemaet, se RAILS-9.
    await expect(page.getByRole("heading", { name: "Grunnleggende saksinformasjon" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Opprett sak" })).toHaveCount(0);
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
