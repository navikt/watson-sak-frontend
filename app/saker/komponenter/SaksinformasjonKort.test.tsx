import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SaksinformasjonKort } from "./SaksinformasjonKort";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakUuid("1", 9),
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "UTREDES",
    kategori: "ARBEID",
    kilde: "PUBLIKUM",
    misbruktype: [],
    prioritet: "NORMAL",
    avslutningskonklusjon: null,
    tilgjengeligeHandlinger: [],
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

describe("SaksinformasjonKort", () => {
  it("renderer backend-shapet kontrollsak med personident, status, opprettet og kilde", () => {
    render(<SaksinformasjonKort sak={lagKontrollsak()} />);

    expect(screen.getByText("1")).toBeDefined();
    expect(screen.getByText("10987654321")).toBeDefined();
    expect(screen.getByText("Utredes")).toBeDefined();
    expect(screen.getByText("3. feb. 2026")).toBeDefined();
    expect(screen.getByText("Publikum")).toBeDefined();
  });
});
