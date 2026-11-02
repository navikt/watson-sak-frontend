import { expect, test } from "@playwright/test";
import { resetMockData } from "~/test/reset-mock-data";

test.describe("Migreringsveileder med syntetiske saker", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
  });

  test("ferdig eksempel viser notatkort og bekreftelse som kan lukkes", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/migrering");
    await page.getByRole("link", { name: "100245" }).click();

    await expect(page).toHaveURL(/\/saker\/1181$/);
    await expect(page.getByRole("heading", { name: "Filer" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Notat fra opprettelse" })).toBeVisible();
    await expect(
      page.getByText("Eksempelnotat for migrering. Kun syntetisk testinnhold."),
    ).toBeVisible();
    const bekreftelse = page.getByRole("status");
    await expect(bekreftelse).toContainText("Saken er ferdig flyttet");
    await expect(page.getByRole("heading", { name: "Sjekkliste – flytt fra Access" })).toHaveCount(
      0,
    );
    await testInfo.attach("sak-ferdig-desktop", {
      body: await page.screenshot(),
      contentType: "image/png",
    });

    await page.getByRole("button", { name: "Lukk bekreftelsen" }).click();
    await expect(bekreftelse).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Notat fra opprettelse" })).toBeVisible();
  });

  test("uferdig eksempel viser sjekkliste uten grønn bekreftelse", async ({ page }) => {
    await page.goto("/migrering");
    await page.getByRole("link", { name: "100310" }).click();

    await expect(page).toHaveURL(/\/saker\/1182$/);
    await expect(
      page.getByRole("heading", { name: "Sjekkliste – flytt fra Access" }),
    ).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "Lastet opp alle filer fra S:" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Marker saken som ferdig flyttet" }),
    ).toBeDisabled();
    await expect(page.getByText("Migreringsnotat (forhåndsvisning)")).toBeVisible();
  });

  test("notatkort og melding er synlige på mobil", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/saker/1181");

    await expect(page.getByRole("link", { name: "Notat fra opprettelse" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Saken er ferdig flyttet");
    await testInfo.attach("sak-ferdig-mobil", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
});

test.describe("Flytt fra Access for saksbehandler", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
  });

  test("viser listen med norske datoer og uten lederkolonner", async ({ page }) => {
    await page.goto("/migrering");

    await expect(page.getByRole("heading", { level: 1, name: "Flytt fra Access" })).toBeVisible();
    for (const kolonne of ["PID", "Fødsels- eller d-nummer", "Opprettet i Access", "Status"]) {
      await expect(page.getByRole("columnheader", { name: kolonne })).toBeVisible();
    }
    await expect(page.getByRole("columnheader", { name: "Saksbehandler" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Endre tildeling/ })).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "15.01.2023" })).toBeVisible();
    await expect(page.getByLabel("Avdeling")).toHaveCount(0);
  });

  test("statusfilter ligger i URL-en og begrenser listen", async ({ page }) => {
    await page.goto("/migrering");
    // Klikkhåndtererne er klientkode, så vent til siden er hydrert.
    await page.waitForLoadState("networkidle");
    const gruppe = page.getByRole("group", { name: "Status" });

    await gruppe.getByText("Under flytting").click();
    await expect(page).toHaveURL(/status=UNDER_MIGRERING/);
    await expect(page.getByRole("link", { name: "100310" })).toBeVisible();
    await expect(page.getByRole("link", { name: "100245" })).toHaveCount(0);
    await expect(page.getByText("Ferdig flyttet")).toHaveCount(1);

    await gruppe.getByText("Under flytting").click();
    await expect(page).not.toHaveURL(/status=/);
    await expect(page.getByRole("link", { name: "100245" })).toBeVisible();
  });

  test("klikk på raden åpner saken", async ({ page }) => {
    await page.goto("/migrering");
    // Klikkhåndtererne er klientkode, så vent til siden er hydrert.
    await page.waitForLoadState("networkidle");

    await page.getByRole("cell", { name: "20.02.2023" }).click();

    await expect(page).toHaveURL(/\/saker\/1182$/);
  });

  test("å starte flytting åpner registreringen med PID, S-område og notat fra Access", async ({
    page,
  }) => {
    await page.goto("/migrering");

    await page.getByRole("button", { name: "Flytt sak med PID 100388 fra Access" }).click();

    await expect(page).toHaveURL(/\/registrer-sak/);
    await expect(page.getByText("PID: 100388")).toBeVisible();
    await expect(page.getByText("Du flytter en sak fra Access")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Filer fra S-området" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Last opp filer fra S:" })).toBeVisible();
    await expect(page.getByLabel(/Notat – informasjon fra Access/)).toBeVisible();
  });

  test("landingssiden viser banner som leder til Flytt fra Access", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Du har saker i Access som skal flyttes!",
      }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Flytt fra Access" }).first().click();

    await expect(page).toHaveURL(/\/migrering/);
  });
});
