import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SakDetaljerFelter } from "./SakDetaljerFelter";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 105,
    personIdent: "12345678901",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z999999", navn: "Lise Raus", enhet: "Øst" },
      deltMed: [],
      opprettetAv: { navIdent: "Z999999", navn: "Lise Raus", enhet: "Øst" },
    },
    status: "UTREDES",
    kategori: "SAMLIV",
    kilde: "ANNET",
    misbruktype: [],
    prioritet: "NORMAL",
    blokkert: null,
    henleggelsesarsak: null,
    ytelser: [
      {
        type: "Foreldrepenger",
        periodeFra: "2022-01-01",
        periodeTil: "2025-01-01",
        belop: 10000,
        endeligBelop: null,
      },
    ],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-02-01T00:00:00Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
    ...overrides,
  };
}

describe("SakDetaljerFelter", () => {
  it("viser personnummer, kategori og kilde", () => {
    render(<SakDetaljerFelter sak={lagKontrollsak()} onVisIdentHistorikk={vi.fn()} />);

    expect(screen.getByText("123456 78901")).toBeDefined();
    expect(screen.getByText("SAMLIV", { exact: false })).toBeDefined();
    expect(screen.getByText("ANNET", { exact: false })).toBeDefined();
  });

  it("viser ytelsestabell med ytelse, periode og beløp", () => {
    render(<SakDetaljerFelter sak={lagKontrollsak()} onVisIdentHistorikk={vi.fn()} />);

    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("Foreldrepenger", { exact: false })).toBeDefined();
    expect(screen.getByText("01.01.2022 – 01.01.2025")).toBeDefined();
    expect(screen.getByText("10 000", { exact: false })).toBeDefined();
  });

  it("viser bindestrek når saken ikke har ytelser", () => {
    render(
      <SakDetaljerFelter sak={lagKontrollsak({ ytelser: [] })} onVisIdentHistorikk={vi.fn()} />,
    );

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByText("–").length).toBeGreaterThan(0);
  });

  it("viser merknad om historisk identifikator når saken ble opprettet under en annen ident", () => {
    render(
      <SakDetaljerFelter
        sak={lagKontrollsak({ gjeldendePersonIdent: "10987654321" })}
        onVisIdentHistorikk={vi.fn()}
      />,
    );

    expect(screen.getByText(/Saken ble opprettet under/)).toBeDefined();
  });
});
