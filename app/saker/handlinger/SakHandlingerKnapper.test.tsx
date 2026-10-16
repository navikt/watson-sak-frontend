import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SakHandlingerKnapper } from "./SakHandlingerKnapper";

vi.mock("~/kodeverk/useKodeverk", () => ({
  useKodeverk: () => ({
    temaer: [
      { kode: "KTR", beskrivelse: "Kontroll" },
      { kode: "KTA", beskrivelse: "Kontroll anmeldelse" },
    ],
  }),
}));

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    enhet: "4812",
  }),
}));

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 101,
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    steg: "UTREDES",
    status: null,
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [
      {
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
        endeligBelop: null,
      },
    ],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-02-03T10:11:12Z",
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

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("SakHandlingerKnapper", () => {
  it("viser ingen handlinger for AVSLUTTET sak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={lagKontrollsak({ steg: "AVSLUTTET" })}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("viser Gosys-handlinger for aktiv ikke-blokkert sak med eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={lagKontrollsak({ steg: "UTREDES", status: null })}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Flytt til neste steg" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Endre status" })).toBeNull();
    expect(screen.getByRole("button", { name: "Arkiver dokument(er) i Gosys" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett oppgave i Gosys" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Stans ytelse" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gjenoppta" })).toBeNull();
  });

  it("viser ingen Gosys-handlinger for sak med steg Opprettet", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={lagKontrollsak({ steg: "OPPRETTET", status: null })}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Flytt til neste steg" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Arkiver dokument(er) i Gosys" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Opprett oppgave i Gosys" })).toBeNull();
  });

  it("viser Gosys-handlinger for blokkert sak med eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={lagKontrollsak({ steg: "UTREDES", status: "VENTER_PA_INFORMASJON" })}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Endre status" })).toBeNull();
    expect(screen.getByRole("button", { name: "Arkiver dokument(er) i Gosys" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett oppgave i Gosys" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Flytt til neste steg" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sett på vent" })).toBeNull();
  });

  it("viser ingen handlinger for eierløs sak når bruker ikke er eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={false}
        filer={[]}
        dokumenter={[]}
        sak={lagKontrollsak({
          steg: "OPPRETTET",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("viser ingen handlinger for eierløs blokkert sak når bruker ikke er eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={false}
        filer={[]}
        dokumenter={[]}
        sak={lagKontrollsak({
          steg: "OPPRETTET",
          status: "I_BERO",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });
});
