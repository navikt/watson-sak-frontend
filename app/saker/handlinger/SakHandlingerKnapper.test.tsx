import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SakHandlingerKnapper } from "./SakHandlingerKnapper";

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    organisasjoner: [],
  }),
}));

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakUuid("101", 9),
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "UTREDES",
    blokkert: null,
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000090101",
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

describe("SakHandlingerKnapper", () => {
  it("viser ingen handlinger for AVSLUTTET sak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({ status: "AVSLUTTET" })}
        seksjoner={[]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("viser Endre status og Sett på vent for aktiv ikke-blokkert sak med eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({ status: "UTREDES", blokkert: null })}
        seksjoner={[]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Endre status" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sett på vent" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Stans ytelse" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gjenoppta" })).toBeNull();
  });

  it("viser kun Gjenoppta for blokkert sak med eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({ status: "UTREDES", blokkert: "VENTER_PA_INFORMASJON" })}
        seksjoner={[]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Gjenoppta" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Endre status" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sett på vent" })).toBeNull();
  });

  it("viser status- og ventehandlinger for eierløs sak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({
          status: "OPPRETTET",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        seksjoner={["4812", "4813"]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Endre status" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sett på vent" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Send til annen enhet" })).toBeNull();
  });

  it("viser kun Gjenoppta for eierløs blokkert sak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        sak={lagKontrollsak({
          status: "OPPRETTET",
          blokkert: "I_BERO",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        seksjoner={["4812", "4813"]}
        historikk={[]}
        filer={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Gjenoppta" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Sett på vent" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Endre status" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tildel saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tildel meg" })).toBeNull();
  });
});
