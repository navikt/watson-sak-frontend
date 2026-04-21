import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { MineSakerInnhold } from "./MineSakerInnhold";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakUuid("201", 2),
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "UFORDELT",
    kategori: "ARBEID",
    kilde: "PUBLIKUM",
    misbruktype: ["FEIL_INNTEKTSGRUNNLAG"],
    prioritet: "NORMAL",
    avslutningskonklusjon: null,
    tilgjengeligeHandlinger: [],
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000020101",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
    ],
    merking: null,
    resultat: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    ...overrides,
  };
}

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("MineSakerInnhold", () => {
  it("viser felles saksliste i aktive saker og beholder grupperingene", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[
          lagKontrollsak(),
          lagKontrollsak({
            id: lagMockSakUuid("202", 2),
            status: "VENTER_PA_VEDTAK",
            oppdatert: "2026-02-05T10:11:12Z",
          }),
        ]}
        detaljSti="/saker"
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Saksid" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Navn" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Misbrukstype" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Oppdatert" })).toBeDefined();

    const lenke = screen.getByRole("link", { name: "201" });
    expect(lenke.getAttribute("href")).toBe(`/saker/${getSaksreferanse(lagMockSakUuid("201", 2))}`);
    expect(screen.getByText("Ola Nordmann")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Oppgaver på vent" }));

    expect(screen.getByRole("link", { name: "202" })).toBeDefined();
  });

  it("bruker oppgitt detaljsti for sakslenker", () => {
    renderMedRouter(<MineSakerInnhold saker={[lagKontrollsak()]} detaljSti="/mine-saker/detalj" />);

    expect(screen.getByRole("link", { name: "201" }).getAttribute("href")).toBe(
      "/mine-saker/detalj/201",
    );
  });

  it("viser riktige tomtekster for aktive, ventende og fullførte grupper", () => {
    renderMedRouter(<MineSakerInnhold saker={[]} detaljSti="/mine-saker/detalj" />);

    expect(screen.getByText("Du har ingen aktive saker.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Oppgaver på vent" }));
    expect(screen.getByText("Du har ingen saker som venter.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Fullførte oppgaver" }));
    expect(screen.getByText("Du har ingen fullførte saker.")).toBeDefined();
  });
});
