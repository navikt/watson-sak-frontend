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
    kategori: "MISBRUK",
    prioritet: "NORMAL",
    status: "UFORDELT",
    ytelseTyper: ["Sykepenger"],
    kilde: "ANONYM_TIPS",
    avklaringResultat: null,
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
    expect(screen.getByText(/Status: Ufordelt/)).toBeDefined();
    expect(screen.getByText(/Misbruk · Normal/)).toBeDefined();
  });

  it("renderer statushendelse med avsluttet status", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "STATUS_ENDRET",
            status: "AVSLUTTET",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Status endret")).toBeDefined();
    expect(screen.getByText(/Status: Avsluttet/)).toBeDefined();
  });
});
