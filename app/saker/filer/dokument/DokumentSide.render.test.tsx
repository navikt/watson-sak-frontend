import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { DokumentInnhold, DokumentNode } from "~/saker/filer/typer";
import DokumentSide from "./DokumentSide.route";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
  env: { ENVIRONMENT: "local-mock" },
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: async () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    preferredUsername: "test@nav.no",
    enhet: "4812",
  }),
}));

vi.mock("~/analytics/analytics", () => ({
  sporHendelse: vi.fn(),
}));

const innhold: DokumentInnhold = [{ type: "p", children: [{ text: "" }] }];

const dokumenter: DokumentNode[] = [
  {
    id: "1",
    tittel: "Saksframlegg",
    endretAv: "Ola",
    endretDato: "2026-02-15",
    låsAv: null,
  },
  {
    id: "2",
    tittel: "Vedtak",
    endretAv: "Kari",
    endretDato: "2026-02-20",
    låsAv: null,
  },
];

function renderSide(kanRedigere: boolean) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId/dokumenter/:docId",
      Component: DokumentSide,
      loader: () => ({
        dokument: {
          id: "1",
          tittel: "Saksframlegg",
          innhold,
          endretAv: "Ola",
          endretDato: "2026-02-15",
          låsAv: null,
        },
        dokumenter,
        sakReferanse: "ABC-123",
        kanRedigere,
        variabelVerdier: {
          navn: "Ola Nordmann",
          fødselsnummer: "01010112345",
          saksnummer: "Sak 105",
          saksbehandler: "Test Saksbehandler",
          avdeling: "4812",
        },
      }),
    },
  ]);
  return render(<Stub initialEntries={["/saker/ABC-123/dokumenter/1"]} />);
}

describe("DokumentSide", () => {
  it("viser brødsmulesti", async () => {
    renderSide(true);

    const sti = await screen.findByRole("navigation", { name: "Du er her" });
    expect(within(sti).getByRole("link", { name: "ABC-123" })).toBeDefined();
    expect(within(sti).getByText("Dokumenter")).toBeDefined();
    expect(within(sti).getByText("Saksframlegg")).toBeDefined();
  });

  it("viser dokumenttreet i sidepanelet uten at man må åpne noe", async () => {
    renderSide(true);

    const sidepanel = await screen.findByRole("complementary");
    expect(within(sidepanel).getByRole("link", { name: /Vedtak/ })).toBeDefined();
  });

  it("kan bytte hva sidepanelet viser via menyen i verktøylinja", async () => {
    renderSide(true);

    fireEvent.click(await screen.findByRole("button", { name: /Dokumenter/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Historikk" }));

    const sidepanel = screen.getByRole("complementary");
    expect(within(sidepanel).getByText(/hvem som har endret dokumentet/)).toBeDefined();
    expect(within(sidepanel).queryByRole("link", { name: /Vedtak/ })).toBeNull();
  });

  it("viser variabler uten søkefelt når listen er kort", async () => {
    renderSide(true);

    fireEvent.click(await screen.findByRole("button", { name: /Dokumenter/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Variabler" }));

    const sidepanel = screen.getByRole("complementary");
    expect(within(sidepanel).getByText("Klikk for å sette inn i dokumentet")).toBeDefined();
    expect(
      within(sidepanel).getByRole("button", { name: "Sett inn variabelen Navn" }),
    ).toBeDefined();
    expect(within(sidepanel).queryByLabelText("Søk i variabler")).toBeNull();

    fireEvent.click(
      within(sidepanel).getByRole("button", { name: "Sett inn variabelen Fødselsnummer" }),
    );
    expect((await screen.findByText("01010112345")).className).toContain(
      "bg-ax-bg-accent-moderate",
    );
  });

  it("viser slett-knapp og en deaktivert medunderskriver-knapp når man kan redigere", async () => {
    renderSide(true);

    expect(await screen.findByRole("button", { name: "Slett" })).toBeDefined();
    const medunderskriver = screen.getByRole("button", { name: "Send til medunderskriver" });
    expect(medunderskriver.hasAttribute("disabled")).toBe(true);
  });

  it("skjuler slett-knapp uten redigeringstilgang", async () => {
    renderSide(false);

    expect(await screen.findByRole("complementary")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Slett" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send til medunderskriver" })).toBeNull();
  });
});
