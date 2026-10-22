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
    steg: "UTREDES",
    kategori: "SAMLIV",
    kilde: "ANNET",
    misbruktype: [],
    prioritet: "NORMAL",
    status: null,
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

  it("viser anmeldt beløp og politidistrikt etter kilde når saken er hos politiet", () => {
    render(
      <SakDetaljerFelter
        sak={lagKontrollsak({
          steg: "POLITI",
          resultat: {
            strafferettsligVurdering: {
              type: "ANMELDT",
              anmeldtBelop: 12500.5,
              politidistrikt: "Øst",
              politietsSaksreferanse: "2026/12345",
            },
          },
        })}
        onVisIdentHistorikk={vi.fn()}
      />,
    );

    const kilde = screen.getByText("Kilde", { exact: true });
    const anmeldtBelop = screen.getByText("Anmeldt beløp", { exact: true });
    const politidistrikt = screen.getByText("Politidistrikt", { exact: true });
    const saksreferanse = screen.getByText("Politiets saksreferanse", { exact: true });
    expect(
      kilde.compareDocumentPosition(anmeldtBelop) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      anmeldtBelop.compareDocumentPosition(politidistrikt) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      politidistrikt.compareDocumentPosition(saksreferanse) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText((tekst) => tekst.replaceAll("\u00a0", " ") === "12 500,5"),
    ).toBeDefined();
    expect(screen.getByText("Øst")).toBeDefined();
    expect(screen.getByText("2026/12345")).toBeDefined();
  });

  it("viser Ikke oppgitt når anmeldt sak mangler politidistrikt", () => {
    render(
      <SakDetaljerFelter
        sak={lagKontrollsak({
          steg: "POLITI",
          resultat: {
            strafferettsligVurdering: { type: "ANMELDT", anmeldtBelop: 12500 },
          },
        })}
        onVisIdentHistorikk={vi.fn()}
      />,
    );

    expect(screen.getByText("Politidistrikt", { exact: true })).toBeDefined();
    expect(screen.getByText("Politiets saksreferanse", { exact: true })).toBeDefined();
    expect(screen.getAllByText("Ikke oppgitt")).toHaveLength(2);
  });

  it.each([
    ["STRAFFERETTSLIG_VURDERING", "ANMELDT", 12500],
    ["POLITI", "ANMELDT", null],
  ] as const)("viser ikke anmeldelse for steg %s med beløp %s", (steg, type, anmeldtBelop) => {
    render(
      <SakDetaljerFelter
        sak={lagKontrollsak({
          steg,
          resultat: { strafferettsligVurdering: { type, anmeldtBelop } },
        })}
        onVisIdentHistorikk={vi.fn()}
      />,
    );

    expect(screen.queryByText("Anmeldt beløp", { exact: true })).toBeNull();
    expect(screen.queryByText("Politidistrikt", { exact: true })).toBeNull();
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
