import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { SakHendelse } from "./typer";
import { SakHistorikk } from "./SakHistorikk";

function lagBackendHendelse(overrides: Partial<SakHendelse> = {}): SakHendelse {
  return {
    hendelseId: "00000000-0000-0000-0000-000000000123",
    tidspunkt: "2026-03-31T10:15:00Z",
    hendelsesType: "SAK_OPPRETTET",
    sakId: "00000000-0000-0000-0000-000000000124",
    kategori: "ARBEID",
    prioritet: "NORMAL",
    status: "OPPRETTET",
    ytelseTyper: ["Sykepenger"],
    kilde: "ANONYM_TIPS",
    avklaringResultat: null,
    mottakEnhet: "4812",
    ...overrides,
  };
}

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });
  return render(<RouterProvider router={router} />);
}

describe("SakHistorikk", () => {
  it("renderer backend hendelsestype og snapshot-felter", () => {
    renderMedRouter(<SakHistorikk sakId="test-sak-id" hendelser={[lagBackendHendelse()]} />);

    expect(screen.getByText("Sak opprettet")).toBeDefined();
    expect(screen.getByText(/Status: Opprettet/)).toBeDefined();
    expect(screen.getByText(/Mottaksenhet: 4812/)).toBeDefined();
  });

  it("renderer avklaringshendelse med avklaringsresultat", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "AVKLARING_OPPRETTET",
            status: "HENLAGT",
            avklaringResultat: "HENLAGT",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Avklaring opprettet")).toBeDefined();
    expect(screen.getByText(/Avklaringsresultat: HENLAGT/)).toBeDefined();
  });

  it("renderer historikk for endret ansvarlig saksbehandler", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "ANSVARLIG_SAKSBEHANDLER_ENDRET",
            berortSaksbehandlerNavn: "Kari Nordmann",
            berortSaksbehandlerNavIdent: "Z123456",
            berortSaksbehandlerEnhet: "Seksjon A",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Ansvarlig saksbehandler endret")).toBeDefined();
    expect(
      screen.getByText(/Ansvarlig saksbehandler: Kari Nordmann \(Z123456\) · Seksjon A/),
    ).toBeDefined();
  });

  it("renderer historikk for fjernet deling", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "TILGANG_FJERNET",
            berortSaksbehandlerNavn: "Ada Larsen",
            berortSaksbehandlerNavIdent: "Z234567",
            berortSaksbehandlerEnhet: "Seksjon B",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Tilgang fjernet")).toBeDefined();
    expect(
      screen.getByText(/Fjernet deling med: Ada Larsen \(Z234567\) · Seksjon B/),
    ).toBeDefined();
  });
});
