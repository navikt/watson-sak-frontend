import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { KontrollsakResponse, KontrollsakSaksbehandler } from "~/saker/types.backend";
import { SaksbehandlereKort } from "./SaksbehandlereKort";

function lagSaksbehandler(
  overrides: Partial<KontrollsakSaksbehandler> = {},
): KontrollsakSaksbehandler {
  return {
    navIdent: "Z123456",
    navn: "Ola Saksbehandler",
    enhet: "4812",
    ...overrides,
  };
}

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakUuid("101", 9),
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: lagSaksbehandler(),
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "UTREDES",
    blokkert: null,
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [],
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

describe("SaksbehandlereKort", () => {
  it("viser Del tilgang i saksbehandler-boksen for aktiv sak med ansvarlig saksbehandler", () => {
    renderMedRouter(
      <SaksbehandlereKort
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Del tilgang" })).toBeDefined();
  });

  it("viser ikke Del tilgang for avsluttet sak", () => {
    renderMedRouter(
      <SaksbehandlereKort
        sak={lagKontrollsak({ status: "AVSLUTTET" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Del tilgang" })).toBeNull();
  });
});
