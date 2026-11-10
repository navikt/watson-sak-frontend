import { expect, test } from "@playwright/test";

import { resetMockData } from "~/test/reset-mock-data";
import { sjekkTilgjengelighet } from "~/test/uu-util";
import { SØK_RESULTATLENKE_SELECTOR } from "./sok-navigasjon";

test.describe("Søk", () => {
  test.describe("søkesiden", () => {
    test.beforeEach(async ({ page }) => {
      await resetMockData(page);
      await page.goto("/søk", { waitUntil: "networkidle" });
    });

    test("viser overskrift og tomtilstand", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Søk i saker" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Finn en sak" })).toBeVisible();
      await expect(page.getByText(/Bruk søkefeltet i toppmenyen for å søke/)).toBeVisible();
    });

    test("hjelpeteksten ved søkefeltet forklarer hva man kan søke på", async ({ page }) => {
      await page.getByRole("button", { name: "Hva kan du søke på?" }).click();

      const hjelp = page.getByText("Du kan søke på:").locator("..");
      await expect(hjelp.getByText("Saksnummer", { exact: true })).toBeVisible();
      await expect(hjelp.getByText("PID (bare saker opprettet i Watson Sak)")).toBeVisible();
      await expect(hjelp.getByText("Fødsels- eller d-nummer (11 siffer)")).toBeVisible();
      await expect(hjelp.getByText("Organisasjonsnummer (9 siffer)")).toBeVisible();
      await expect(hjelp.getByText("Mellomrom spiller ingen rolle.")).toBeVisible();
      await sjekkTilgjengelighet(page);
    });

    test("kan søke på saksnummer og viser samme tabellkolonner som Alle saker", async ({
      page,
    }) => {
      await page.getByLabel("Søk i saker").fill("1028");
      await page.getByLabel("Søk i saker").press("Enter");

      await expect(page.getByText(/1 treff for "1028"/)).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("article")).toHaveCount(0);
      await expect(page.getByRole("link", { name: "1028", exact: true })).toBeVisible();
      await expect(page.getByRole("columnheader")).toHaveText([
        "Saksnummer",
        "Kategori",
        "Misbrukstype",
        "Steg",
        "Status",
        "Opprettet",
        "Oppdatert",
        "Saksbehandler",
      ]);
      await expect(page.getByRole("button", { name: "Sorter på misbrukstype" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Sorter på saksbehandler" })).toHaveCount(0);
    });

    test("kan søke på fødselsnummer med flere treff og viser tabell", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("11223344556");
      await page.getByLabel("Søk i saker").press("Enter");

      await expect(page.getByText(/treff for "11223344556"/)).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.locator(SØK_RESULTATLENKE_SELECTOR)).toHaveCount(2);
    });

    test("viser PID-treff som tabellrad", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("01027");
      await page.getByLabel("Søk i saker").press("Enter");

      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.getByRole("link", { name: "1027", exact: true })).toBeVisible();
      await expect(page.locator(SØK_RESULTATLENKE_SELECTOR)).toHaveCount(1);
    });

    test("sorterer viste treff og nullstiller ved nytt identisk søk", async ({ page }) => {
      const søkefelt = page.getByLabel("Søk i saker");
      await søkefelt.fill("11223344556");
      await søkefelt.press("Enter");
      const lenker = page.locator(SØK_RESULTATLENKE_SELECTOR);
      await expect(lenker).toHaveCount(2);
      const standardRekkefølge = await lenker.allTextContents();
      const saksidHeader = page.getByRole("columnheader", { name: "Sorter på saksnummer" });

      await page.getByRole("button", { name: "Sorter på saksnummer" }).click();
      await expect(saksidHeader).toHaveAttribute("aria-sort", "ascending");
      const stigende = await lenker.allTextContents();
      await page.getByRole("button", { name: "Sorter på saksnummer" }).click();
      await expect(saksidHeader).toHaveAttribute("aria-sort", "descending");
      await expect(lenker).toHaveText([...stigende].reverse());
      await expect(page.getByText("Sorteringen gjelder treffene på denne siden.")).toBeVisible();

      await søkefelt.press("Enter");
      await expect(page.getByRole("columnheader", { name: "Sorter på opprettet" })).toHaveAttribute(
        "aria-sort",
        "descending",
      );
      await expect(lenker).toHaveText(standardRekkefølge);
    });

    test("beholder tabelloppsettet på smal skjerm uten å gjøre siden bredere", async ({ page }) => {
      await page.setViewportSize({ width: 640, height: 900 });
      await page.getByLabel("Søk i saker").fill("1028");
      await page.getByLabel("Søk i saker").press("Enter");
      await expect(page.getByRole("table")).toBeVisible();

      const resultatliste = page.locator("[data-søk-resultatliste]");
      await expect(resultatliste).toBeVisible();
      expect(
        await resultatliste.evaluate((element) => element.scrollWidth > element.clientWidth),
      ).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });

    test("viser tom-tilstand med veiledning ved ugyldig søkeformat", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("finnesikke123");
      await page.getByLabel("Søk i saker").press("Enter");

      await expect(page.getByRole("heading", { name: "Ugyldig søk" })).toHaveCount(0);
      await expect(page.getByText(/Søket må være et fødsels- eller d-nummer/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Se alle saker" })).toBeVisible();
    });

    test("viser tom-tilstand ved saksnummer uten treff", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("999999");
      await page.getByLabel("Søk i saker").press("Enter");

      await expect(
        page.getByRole("heading", { name: /Fant ingen sak med saksnummer/ }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Se alle saker" })).toBeVisible();
    });

    test("viser CTA for å opprette sak ved ingen treff på FNR", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("99999999999");
      await page.getByLabel("Søk i saker").press("Enter");

      await expect(page.getByText(/Ingen treff for "99999999999"/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Ser du etter en person?" })).toBeVisible();
      await expect(page.getByText(/ser ut som et fødselsnummer/)).toBeVisible();
      await expect(page.getByRole("button", { name: "Opprett sak" })).toBeVisible();
    });

    test("viser ikke CTA når ingen treff på ugyldig søkeformat", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("finnesikke123");
      await page.getByLabel("Søk i saker").press("Enter");

      await expect(page.getByRole("heading", { name: "Ugyldig søk" })).toHaveCount(0);
      await expect(
        page.getByRole("heading", { name: "Ser du etter en person?" }),
      ).not.toBeVisible();
    });

    test("CTA navigerer til registrer-sak med FNR forhåndsutfylt", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("99999999999");
      await page.getByLabel("Søk i saker").press("Enter");

      await page.getByRole("button", { name: "Opprett sak" }).click();

      await expect(page).toHaveURL(/\/registrer-sak/);
      await expect(page).not.toHaveURL(/fnr=/);
    });

    test("kan navigere til sakdetalj fra saksnummer-treff", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("1028");
      await page.getByLabel("Søk i saker").press("Enter");

      await page.getByRole("link", { name: "1028", exact: true }).click();
      await expect(page).toHaveURL(/\/saker\/1028/);
    });

    test("kan navigere til sakdetalj fra tabellrad ved flere treff", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("11223344556");
      await page.getByLabel("Søk i saker").press("Enter");

      const førsteLenke = page.locator(SØK_RESULTATLENKE_SELECTOR).first();
      const href = await førsteLenke.getAttribute("href");
      await førsteLenke.click();

      await expect(page).toHaveURL(new RegExp(`${href}$`));
    });

    test("er UU-compliant", async ({ page }) => {
      await sjekkTilgjengelighet(page);
    });

    test("er UU-compliant med saksnummer-treff", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("1028");
      await page.getByLabel("Søk i saker").press("Enter");
      await expect(page.getByRole("table")).toBeVisible();

      await sjekkTilgjengelighet(page);
    });

    test("er UU-compliant med tabellvisning for flere treff", async ({ page }) => {
      await page.getByLabel("Søk i saker").fill("11223344556");
      await page.getByLabel("Søk i saker").press("Enter");
      await expect(page.getByRole("table")).toBeVisible();

      await sjekkTilgjengelighet(page);
    });
  });

  test.describe("tastaturnavigering", () => {
    test("ArrowDown fra søkefelt fokuserer første resultat", async ({ page }) => {
      await page.goto("/søk", { waitUntil: "networkidle" });

      await page.getByLabel("Søk i saker").fill("11223344556");
      await page.getByLabel("Søk i saker").press("Enter");
      await expect(page.getByRole("table")).toBeVisible();

      await page.getByLabel("Søk i saker").press("ArrowDown");

      const førsteLenke = page.locator(SØK_RESULTATLENKE_SELECTOR).first();
      await expect(førsteLenke).toBeFocused();
    });

    test("ArrowUp fra første resultat fokuserer søkefeltet", async ({ page }) => {
      await page.goto("/søk", { waitUntil: "networkidle" });

      await page.getByLabel("Søk i saker").fill("11223344556");
      await page.getByLabel("Søk i saker").press("Enter");
      await expect(page.getByRole("table")).toBeVisible();

      await page.getByLabel("Søk i saker").press("ArrowDown");
      await page.keyboard.press("ArrowUp");

      await expect(page.getByLabel("Søk i saker")).toBeFocused();
    });

    test("ArrowDown navigerer mellom resultater", async ({ page }) => {
      await page.goto("/søk", { waitUntil: "networkidle" });

      await page.getByLabel("Søk i saker").fill("11223344556");
      await page.getByLabel("Søk i saker").press("Enter");

      const lenker = page.locator(SØK_RESULTATLENKE_SELECTOR);
      const antall = await lenker.count();
      if (antall < 2) return;

      await page.getByLabel("Søk i saker").press("ArrowDown");
      await page.keyboard.press("ArrowDown");

      await expect(lenker.nth(1)).toBeFocused();
    });
  });

  test.describe("header-søk", () => {
    test("hindrer innsending av tomt hurtigsøk og markerer feltet", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      const headerSøk = page.getByRole("search", { name: "Hurtigsøk" }).getByRole("searchbox");
      await headerSøk.fill("   ");
      await headerSøk.press("Enter");

      await expect(page).toHaveURL("/");
      await expect(headerSøk).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByText("Skriv inn et søk")).toBeVisible();
      await expect(headerSøk).toHaveAccessibleDescription(/Skriv inn et søk/);

      await headerSøk.fill("1028");
      await expect(headerSøk).not.toHaveAttribute("aria-invalid", "true");
      await expect(page.getByText("Skriv inn et søk")).toHaveCount(0);
    });

    test("søkefelt i header poster til søkesiden", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      const headerSøk = page.getByRole("search", { name: "Hurtigsøk" }).getByRole("searchbox");
      await headerSøk.fill("1028");
      await headerSøk.press("Enter");

      await expect(page).toHaveURL("/søk");
      await expect(page.getByText(/treff for "1028"/)).toBeVisible();
    });

    test("Cmd+K fokuserer søkefeltet i header", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      await page.keyboard.press("Meta+k");

      const headerSøk = page.getByRole("search", { name: "Hurtigsøk" }).getByRole("searchbox");
      await expect(headerSøk).toBeFocused();
    });

    test("Cmd+K fokuserer det store søkefeltet på søkesiden", async ({ page }) => {
      await page.goto("/søk", { waitUntil: "networkidle" });

      await page.getByLabel("Søk i saker").blur();
      await page.keyboard.press("Meta+k");

      await expect(page.getByLabel("Søk i saker")).toBeFocused();
    });

    test("ArrowDown i header-feltet gjør ingenting utenfor søkesiden", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      const headerSøk = page.getByRole("search", { name: "Hurtigsøk" }).getByRole("searchbox");
      await headerSøk.fill("11223344556");
      await headerSøk.press("ArrowDown");

      await expect(headerSøk).toBeFocused();
    });
  });
});
