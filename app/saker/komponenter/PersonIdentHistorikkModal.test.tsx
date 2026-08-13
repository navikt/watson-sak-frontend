import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { PersonIdentHistorikkModal } from "./PersonIdentHistorikkModal";

function lagSak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 1,
    personIdent: "12345678901",
    personNavn: "Test Person",
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
    saksbehandlere: {
      eier: null,
      deltMed: [],
      opprettetAv: { navIdent: "Z123456", navn: "Test Saksbehandler", enhet: "4812" },
    },
    status: "UTREDES",
    blokkert: null,
    henleggelsesarsak: null,
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-01-01T10:00:00Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    ...overrides,
  };
}

describe("PersonIdentHistorikkModal", () => {
  it("viser tom-tilstand når historiskeIdenter er tom", () => {
    render(
      <PersonIdentHistorikkModal
        sak={lagSak({ historiskeIdenter: [] })}
        åpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Ingen historiske identifikatorer funnet.")).toBeDefined();
  });

  it("viser rad for hvert fødselsnummer med riktig type-label", () => {
    const sak = lagSak({
      historiskeIdenter: [
        { personIdent: "12345678901", type: "FOEDSELSNUMMER", historisk: false },
        { personIdent: "09876543210", type: "FOEDSELSNUMMER", historisk: true },
      ],
    });

    render(<PersonIdentHistorikkModal sak={sak} åpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("12345678901")).toBeDefined();
    expect(screen.getByText("09876543210")).toBeDefined();
    expect(screen.getAllByText("Fødselsnummer")).toHaveLength(2);
  });

  it("viser D-nummer som type-label for DNR-ident", () => {
    const sak = lagSak({
      historiskeIdenter: [{ personIdent: "41234567890", type: "DNR", historisk: true }],
    });

    render(<PersonIdentHistorikkModal sak={sak} åpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("D-nummer")).toBeDefined();
  });

  it("viser ukjent type-kode uendret som fallback", () => {
    const sak = lagSak({
      historiskeIdenter: [{ personIdent: "12345678901", type: "UKJENT_TYPE", historisk: false }],
    });

    render(<PersonIdentHistorikkModal sak={sak} åpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("UKJENT_TYPE")).toBeDefined();
  });

  it("viser Gjeldende-tag for ikke-historisk ident og Historisk-tag for historisk ident", () => {
    const sak = lagSak({
      historiskeIdenter: [
        { personIdent: "12345678901", type: "FOEDSELSNUMMER", historisk: false },
        { personIdent: "09876543210", type: "FOEDSELSNUMMER", historisk: true },
      ],
    });

    render(<PersonIdentHistorikkModal sak={sak} åpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Gjeldende")).toBeDefined();
    expect(screen.getByText("Historisk")).toBeDefined();
  });
});
