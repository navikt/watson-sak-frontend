import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";
import { ventPåHydrering } from "~/test/vent-på-hydrering";

test.describe("Sakdetalj", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/saker/101", { waitUntil: "networkidle" });
    await ventPåHydrering(page);
    await expect(page.getByRole("heading", { name: /^Sak 101/ })).toBeVisible();
    // Tildel saken til innlogget bruker for å aktivere redigeringsknapper
    await page.getByRole("button", { name: "Tildel meg" }).click();
    await expect(page.getByRole("button", { name: "Endre saksinformasjon" })).toBeVisible();
  });

  test("kan åpne og lukke endre-ansvarlig-modal", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeEnabled();
    await page.getByRole("button", { name: "Endre ansvarlig saksbehandler" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("heading", { name: "Endre ansvarlig saksbehandler" }),
    ).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "Saksbehandler" })).toBeVisible();

    // Vent til modal-animasjonen er ferdig før UU-sjekk
    await sjekkTilgjengelighet(page);

    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("kan redigere saksinformasjon inline", async ({ page }) => {
    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();

    await page.getByLabel("Kategori (må fylles ut)").selectOption("ARBEID");

    const misbruktypeCombobox = page.getByLabel("Misbrukstype");
    await misbruktypeCombobox.click();
    await page.getByRole("option", { name: "Svart arbeid" }).click();
    await misbruktypeCombobox.press("Escape");

    const merkingCombobox = page.getByLabel("Merking");
    await merkingCombobox.click();
    await page.getByRole("option", { name: "Lime" }).click();
    await merkingCombobox.press("Escape");

    await page.getByLabel("Kilde (må fylles ut)").selectOption("PUBLIKUM");

    const ytelseCombobox = page.getByLabel("Ytelse").first();
    await ytelseCombobox.fill("Dagpenger");
    await expect(page.getByRole("option", { name: "Dagpenger", exact: true })).toBeVisible();
    // Valgt ytelse står først også ved filtrering. Det nye treffet står sist.
    await ytelseCombobox.press("End");
    await ytelseCombobox.press("Enter");
    await ytelseCombobox.press("Escape");

    await page.getByLabel("Fra", { exact: true }).fill("01.02.2026");
    await page.getByLabel("Til", { exact: true }).fill("28.02.2026");

    await page.getByRole("button", { name: "Lagre" }).click();
    await expect(page.getByRole("button", { name: "Endre saksinformasjon" })).toBeVisible();

    await expect(page.getByRole("combobox", { name: "Kategori" })).toHaveCount(0);
    await expect(page.getByText("Arbeid", { exact: true })).toBeVisible();
    await expect(page.getByText("Svart arbeid", { exact: true })).toBeVisible();
    await expect(page.getByText("Lime", { exact: true })).toBeVisible();
    await expect(page.getByText("Publikum", { exact: true })).toBeVisible();
    await expect(page.getByText("Dagpenger", { exact: true })).toBeVisible();
    await expect(page.getByText("01.02.2026 – 28.02.2026")).toBeVisible();
    await expect(page.getByText("123456 78901", { exact: true }).first()).toBeVisible();
  });

  test("kan avbryte redigering uten å lagre endringer", async ({ page }) => {
    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();

    await page.getByLabel("Kategori").selectOption("ARBEID");
    await page.getByRole("button", { name: "Avbryt" }).click();

    await expect(page.getByRole("button", { name: "Endre saksinformasjon" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Kategori" })).toHaveCount(0);
    await expect(page.getByText("Samliv", { exact: true })).toBeVisible();
    await expect(page.getByText("Arbeid", { exact: true })).toHaveCount(0);
  });

  test("viser handlinger som backend tillater", async ({ page }) => {
    await page.getByRole("button", { name: "Endre steg", exact: true }).click();

    const dialog = page.getByRole("dialog", { name: "Endre steg eller registrer resultat" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("region", { name: "Steg" }).getByRole("button").first(),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Lukk" }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("resetter datofelter etter avbryt og ny redigering", async ({ page }) => {
    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();

    await page.getByLabel("Fra", { exact: true }).fill("01.02.2026");
    await page.getByLabel("Til", { exact: true }).fill("28.02.2026");
    await page.getByRole("button", { name: "Avbryt" }).click();

    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();

    await expect(page.getByLabel("Fra", { exact: true })).toHaveValue("13.01.2026");
    await expect(page.getByLabel("Til", { exact: true })).toHaveValue("13.01.2026");
  });

  test("viser ikke gamle valideringsfeil etter avbryt og ny redigering", async ({ page }) => {
    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();

    await page.getByLabel("Kilde").selectOption("");
    await page.getByRole("button", { name: "Lagre" }).click();

    await expect(page.locator(".aksel-error-message", { hasText: "Velg kilde" })).toBeVisible();

    await page.getByRole("button", { name: "Avbryt" }).click();
    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();

    await expect(page.locator(".aksel-error-message", { hasText: "Velg kilde" })).toHaveCount(0);
  });

  test("viser ikke status og saksbehandler som redigerbare felt", async ({ page }) => {
    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();

    await expect(page.getByRole("combobox", { name: "Status" })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Saksbehandler" })).toHaveCount(0);
  });

  test("varsler ved navigering bort med ulagrede endringer", async ({ page }) => {
    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();
    await page.getByLabel("Kategori").selectOption("ARBEID");

    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      await dialog.dismiss();
    });

    await page.getByRole("link", { name: "Oversikt" }).click();
    await expect(page).toHaveURL(/\/saker\/101$/);
  });

  test("varsler ved refresh med ulagrede endringer", async ({ page }) => {
    await page.getByRole("button", { name: "Endre saksinformasjon" }).click();
    await page.getByLabel("Kategori").selectOption("ARBEID");

    const dialogPromise = page.waitForEvent("dialog");
    const reloadPromise = page.reload({ waitUntil: "load" });
    const dialog = await dialogPromise;

    expect(dialog.type()).toBe("beforeunload");
    await dialog.accept();
    await reloadPromise;
    await expect(page).toHaveURL(/\/saker\/101$/);
  });

  test("er UU-compliant", async ({ page }) => {
    await sjekkTilgjengelighet(page);
  });
});

test.describe("Sakdetalj – dokumentoversikt i Gosys", () => {
  test.describe.configure({ mode: "serial" });

  // Sak 201 står i utredning og eies av innlogget bruker, så Gosys-handlingene vises
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/saker/201", { waitUntil: "networkidle" });
    await ventPåHydrering(page);
    await expect(page.getByRole("heading", { name: /^Sak 201/ })).toBeVisible();
  });

  test("kan åpne dokumentoversikten i Gosys og se dokumentene i en journalpost", async ({
    page,
  }) => {
    const panel = page.getByRole("region", { name: "Dokumentoversikt i Gosys for sak 201" });
    await expect(panel.getByRole("button", { name: "Opprett oppgave i Gosys" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Arkiver dokument(er) i Gosys" })).toBeVisible();

    await panel.getByRole("button", { name: "Åpne dokumentoversikt" }).click();
    await expect(
      panel.getByRole("cell", { name: "Svarbrev om kontoopplysninger", exact: true }),
    ).toBeVisible();

    await panel
      .getByRole("button", { name: "Vis dokumenter for Svarbrev om kontoopplysninger" })
      .click();
    await expect(
      panel.getByRole("cell", { name: "Kontoutskrift januar", exact: true }),
    ).toBeVisible();

    await sjekkTilgjengelighet(page);
  });

  for (const variant of ["med dokument", "uten dokument", "tomt arkiv", "hentefeil"] as const) {
    test(`kan opprette oppgave: ${variant}`, async ({ page }, testInfo) => {
      if (variant === "tomt arkiv" || variant === "hentefeil") {
        await page.route("**/api/saker/201/arkiv/journalposter", (route) =>
          route.fulfill({
            status: variant === "hentefeil" ? 503 : 200,
            json:
              variant === "hentefeil"
                ? { status: "feil", årsak: "utilgjengelig" }
                : { status: "ok", journalposter: [] },
          }),
        );
      }
      if (variant === "tomt arkiv") await page.setViewportSize({ width: 390, height: 844 });

      await page.getByRole("button", { name: "Opprett oppgave i Gosys" }).click();
      const dialog = page.getByRole("dialog", { name: "Opprett oppgave i Gosys" });
      const utenDokument = dialog.getByRole("radio", {
        name: "Opprett oppgave uten tilknytning til et dokument",
      });
      await expect(utenDokument).not.toBeChecked();
      await dialog.getByLabel("Tema", { exact: true }).selectOption("KTR");
      await dialog.getByLabel("Oppgavetype", { exact: true }).selectOption("VUR");
      await dialog.getByLabel("Prioritet", { exact: true }).selectOption("NORMAL");
      await dialog
        .getByLabel("Frist", { exact: true })
        .fill(`01.12.${new Date().getFullYear() + 1}`);
      await dialog.getByRole("combobox", { name: "Behandlende enhet" }).fill("4111");
      await dialog
        .getByRole("option", { name: "4111 - Nav kontaktsenter Rogaland", exact: true })
        .click();
      await dialog.getByRole("combobox", { name: "Gjelderverdi" }).fill("Dagpenger");
      await dialog.getByRole("option", { name: "Dagpenger", exact: true }).click();
      await dialog.getByLabel("Beskrivelse", { exact: true }).fill("Følg opp kontrollsaken");

      if (variant === "hentefeil") {
        await expect(
          dialog.getByText("Kunne ikke hente journalførte dokumenter fra Gosys."),
        ).toBeVisible();
        await expect(dialog.getByRole("button", { name: "Prøv igjen" })).toBeVisible();
      }
      if (variant === "tomt arkiv") {
        await expect(
          dialog.getByText(/Saken har ingen journalførte dokumenter i Gosys/),
        ).toBeVisible();
      }
      await sjekkTilgjengelighet(page);
      if (variant === "tomt arkiv" || variant === "hentefeil") {
        await utenDokument.scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath("oppgave-skjema.png") });
      }

      if (variant === "med dokument") {
        await dialog
          .getByRole("radio", { name: "Svarbrev om kontoopplysninger", exact: true })
          .check();
      } else {
        await utenDokument.check();
      }
      await dialog.getByRole("button", { name: "Lagre", exact: true }).click();
      await expect(
        dialog.getByText(
          variant === "med dokument"
            ? "Svarbrev om kontoopplysninger"
            : "Ingen dokumenttilknytning",
          { exact: true },
        ),
      ).toBeVisible();
      await sjekkTilgjengelighet(page);
      await dialog.getByRole("button", { name: "Opprett", exact: true }).click();
      const suksess = page.getByRole("dialog", { name: "Oppgave opprettet" });
      await expect(suksess).toBeVisible();
      await suksess.getByRole("button", { name: "Lukk", exact: true }).last().click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
  }

  test("viser ny journalpost med en gang og oppdaterer den når Gosys har den", async ({ page }) => {
    // Gosys har ikke journalposten ennå
    await page.route("**/api/saker/201/arkiv/journalposter", (route) =>
      route.fulfill({ json: { status: "ok", journalposter: [] } }),
    );
    const panel = page.getByRole("region", { name: "Dokumentoversikt i Gosys for sak 201" });

    await panel.getByRole("button", { name: "Arkiver dokument(er) i Gosys" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Tema").selectOption("KTR");
    await dialog.getByLabel("Dokumentbeskrivelse", { exact: true }).selectOption("Annet");
    await dialog.getByLabel("Selvvalgt dokumentbeskrivelse").fill("Varsel om kontroll");
    await dialog
      .getByRole("group", { name: "Filer og dokumenter fra saken" })
      .getByRole("checkbox")
      .first()
      .check();
    await dialog.getByRole("button", { name: "Arkiver" }).click();
    await expect(
      dialog.getByText(/^Dokument(et|ene) er arkivert og journalført i Gosys$/),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Knytt til oppgave" })).toBeVisible();
    // Både lukkekrysset i headeren og knappen i footeren heter «Lukk»
    await dialog.getByRole("button", { name: "Lukk" }).last().click();

    const rad = panel.getByRole("row", { name: /Varsel om kontroll/ });
    await expect(rad).toBeVisible();
    await expect(rad.getByText("Venter på Gosys")).toBeVisible();

    await page.unroute("**/api/saker/201/arkiv/journalposter");
    await expect(rad.getByText("Journalført")).toBeVisible({ timeout: 10_000 });
    await expect(rad.getByText("Venter på Gosys")).toHaveCount(0);
  });

  test("viser feilmelding i dokumentoversikten når Gosys feiler, uten at siden går ned", async ({
    page,
  }) => {
    await page.route("**/api/saker/201/arkiv/journalposter", (route) =>
      route.fulfill({ status: 503, json: { status: "feil", årsak: "utilgjengelig" } }),
    );
    const panel = page.getByRole("region", { name: "Dokumentoversikt i Gosys for sak 201" });

    await panel.getByRole("button", { name: "Åpne dokumentoversikt" }).click();

    await expect(
      panel.getByText("Kunne ikke hente dokumentoversikten fra Gosys. Prøv igjen."),
    ).toBeVisible();
    await expect(panel.getByRole("button", { name: "Prøv igjen" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Arkiver dokument(er) i Gosys" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Filer" })).toBeVisible();
  });
});
