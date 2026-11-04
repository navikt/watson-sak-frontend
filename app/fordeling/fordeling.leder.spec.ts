import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";

test.describe("Ufordelte saker for leder", () => {
  test.beforeEach(async ({ page }) => {
    await resetMockData(page);
    await page.goto("/fordeling", { waitUntil: "networkidle" });
  });

  test("viser egen enhet som standard og kan velge hele organisasjonen", async ({
    page,
  }, testInfo) => {
    const omfang = page.getByRole("combobox", { name: "Vis" });

    await expect(page.getByRole("heading", { name: "Ufordelte saker i Øst" })).toBeVisible();
    await expect(omfang).toHaveValue("enhet:ky153k");
    await expect(omfang.getByRole("option", { name: "Meg selv" })).toHaveCount(0);

    await page.screenshot({
      path: testInfo.outputPath("fordeling-leder-desktop.png"),
      fullPage: true,
    });

    await omfang.selectOption("organisasjon");

    await expect(
      page.getByRole("heading", { name: "Ufordelte saker i hele organisasjonen" }),
    ).toBeVisible();
    await expect(page).toHaveTitle(
      /^Ufordelte saker i hele organisasjonen – Watson Sak(?: \(local-mock\))?$/,
    );
    await expect(omfang).toHaveValue("organisasjon");
  });

  test("bevarer filtre og sortering, men nullstiller siden ved enhetsbytte", async ({ page }) => {
    await page.goto(
      "/fordeling?side=1&kategori=ARBEID&misbrukstype=FIKTIVT_ARBEIDSFORHOLD&steg=OPPRETTET&sorter=kategori&retning=stigende",
      { waitUntil: "networkidle" },
    );

    const omfang = page.getByRole("combobox", { name: "Vis" });
    await expect(page.getByRole("button", { name: "Arbeid", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("button", { name: "Fiktivt arbeidsforhold" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await omfang.selectOption("organisasjon");
    await expect(
      page.getByRole("heading", {
        name: "Ufordelte saker i hele organisasjonen – Arbeid, Fiktivt arbeidsforhold, Opprettet",
      }),
    ).toBeVisible();

    const url = new URL(page.url());
    expect(url.searchParams.get("omfang")).toBe("organisasjon");
    expect(url.searchParams.get("kategori")).toBe("ARBEID");
    expect(url.searchParams.get("misbrukstype")).toBe("FIKTIVT_ARBEIDSFORHOLD");
    expect(url.searchParams.get("steg")).toBe("OPPRETTET");
    expect(url.searchParams.get("sorter")).toBe("kategori");
    expect(url.searchParams.get("retning")).toBe("stigende");
    expect(url.searchParams.has("side")).toBe(false);
  });

  test("viser filter og enhetsvelger for tom søsterenhet og lar lederen gå tilbake", async ({
    page,
  }) => {
    const omfang = page.getByRole("combobox", { name: "Vis" });

    await omfang.selectOption("enhet:ky153k-1");

    await expect(page.getByRole("heading", { name: "Ufordelte saker i Øst 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ingen ufordelte saker" })).toBeVisible();
    await expect(omfang).toBeVisible();
    await expect(page.getByText("Steg", { exact: true })).toBeVisible();
    await expect(page.getByText("Kategori", { exact: true })).toBeVisible();
    await expect(page.getByText("Misbrukstype", { exact: true })).toBeVisible();

    await omfang.selectOption("enhet:ky153k");

    await expect(page.getByRole("heading", { name: "Ufordelte saker i Øst" })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  // Native select: nettleseren eier nedtrekkslisten, så Playwright kan ikke styre den med tastaturet.
  test("enhetsvelgeren kan nås med tastatur og siden består UU-sjekken", async ({ page }) => {
    const omfang = page.getByRole("combobox", { name: "Vis" });

    await page.getByRole("heading", { name: "Ufordelte saker i Øst" }).click();
    for (
      let i = 0;
      i < 10 && !(await omfang.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press("Tab");
    }
    await expect(omfang).toBeFocused();
    await omfang.selectOption("enhet:ky153k-1");

    await expect(omfang).toHaveValue("enhet:ky153k-1");
    await expect(page.getByRole("heading", { name: "Ufordelte saker i Øst 1" })).toBeVisible();
    await sjekkTilgjengelighet(page);
  });

  test("tildeler en sak fra en annen enhet og oppdaterer antall ufordelte saker", async ({
    page,
  }) => {
    const omfang = page.getByRole("combobox", { name: "Vis" });
    const sak = page
      .locator("tbody tr")
      .filter({ hasText: "109" })
      .filter({ hasText: "Feil inntektsgrunnlag" })
      .filter({ hasText: "Arbeid" });

    await expect(sak).toHaveCount(0);
    await omfang.selectOption("organisasjon");
    await expect(sak).toHaveCount(1);

    const antallUfordelte = page
      .locator("#maincontent div[data-color='accent']")
      .filter({ hasText: "Ikke fordelt" })
      .locator("p")
      .first();
    const antallFørTildeling = Number(await antallUfordelte.innerText());

    await sak.getByRole("button", { name: "Tildel" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Saksbehandler").fill("Saks Behandlersen");
    await dialog.getByRole("option", { name: "Saks Behandlersen (Z999999)" }).click();

    const tildelKnapp = dialog.getByRole("button", { name: "Tildel" });
    await expect(tildelKnapp).toBeEnabled();
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes("/fordeling") && response.request().method() === "POST",
      ),
      tildelKnapp.click(),
    ]);

    await expect(dialog).not.toBeVisible();
    await expect(sak).toHaveCount(0);
    await expect(antallUfordelte).toHaveText(String(antallFørTildeling - 1));
  });
});
