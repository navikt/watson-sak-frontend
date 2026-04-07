import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SakHendelse } from "./typer";
import { SakHistorikk } from "./SakHistorikk";

function lagBackendHendelse(overrides: Partial<SakHendelse> = {}): SakHendelse {
  return {
    hendelseId: "00000000-0000-0000-0000-000000000123",
    tidspunkt: "2026-03-31T10:15:00Z",
    hendelsesType: "SAK_OPPRETTET",
    sakId: "00000000-0000-0000-0000-000000000124",
    kategori: "FEILUTBETALING",
    prioritet: "NORMAL",
    status: "OPPRETTET",
    ytelseTyper: ["Sykepenger"],
    kilde: "ANONYM_TIPS",
    avklaringResultat: null,
    mottakEnhet: "4812",
    ...overrides,
  };
}

describe("SakHistorikk", () => {
  it("renderer backend hendelsestype og snapshot-felter", () => {
    render(<SakHistorikk hendelser={[lagBackendHendelse()]} />);

    expect(screen.getByText("Sak opprettet")).toBeDefined();
    expect(screen.getByText(/Status: Opprettet/)).toBeDefined();
    expect(screen.getByText(/Mottaksenhet: 4812/)).toBeDefined();
  });

  it("renderer avklaringshendelse med avklaringsresultat", () => {
    render(
      <SakHistorikk
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
});
