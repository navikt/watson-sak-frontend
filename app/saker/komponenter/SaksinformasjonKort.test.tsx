import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SaksinformasjonKort } from "./SaksinformasjonKort";

vi.mock("~/kodeverk/useKodeverk", () => ({
  useKodeverk: () => mockKodeverk,
}));

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
    steg: "POLITI",
    status: null,
    kategori: "SAMLIV",
    kilde: "ANNET",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [],
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
    resultat: {
      strafferettsligVurdering: {
        type: "ANMELDT",
        anmeldtBelop: 12500,
        politidistrikt: "Øst politidistrikt",
      },
    },
    ...overrides,
  };
}

function renderKort(sak: KontrollsakResponse) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <SaksinformasjonKort
            sak={sak}
            tittel="Saksinformasjon"
            kanRedigere={true}
            onVisIdentHistorikk={vi.fn()}
            onSakOppdatert={vi.fn()}
          />
        ),
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("SaksinformasjonKort anmeldelsesfelter", () => {
  it("viser anmeldelsesfeltene forhåndsutfylt for anmeldt sak hos politiet", () => {
    renderKort(lagKontrollsak());

    fireEvent.click(screen.getByRole("button", { name: "Endre saksinformasjon" }));

    expect(screen.getByRole("heading", { name: "Anmeldelse" })).toBeDefined();
    expect((screen.getByLabelText("Anmeldt beløp (kr)") as HTMLInputElement).value).toBe("12 500");
    const politidistrikt = screen.getByLabelText("Politidistrikt") as HTMLSelectElement;
    expect(politidistrikt.tagName).toBe("SELECT");
    expect(politidistrikt.value).toBe("Øst politidistrikt");
  });

  it("krever nytt valg når lagret politidistrikt ikke finnes i listen", () => {
    renderKort(
      lagKontrollsak({
        resultat: {
          strafferettsligVurdering: {
            type: "ANMELDT",
            anmeldtBelop: 12500,
            politidistrikt: "Østlandet",
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Endre saksinformasjon" }));

    const politidistrikt = screen.getByLabelText("Politidistrikt") as HTMLSelectElement;
    expect(politidistrikt.value).toBe("");
  });

  it.each([
    ["STRAFFERETTSLIG_VURDERING", "ANMELDT"],
    ["POLITI", "HENLAGT"],
  ] as const)("viser ikke anmeldelsesfelter for steg %s og vurdering %s", (steg, type) => {
    renderKort(
      lagKontrollsak({
        steg,
        resultat: { strafferettsligVurdering: { type, anmeldtBelop: 12500 } },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Endre saksinformasjon" }));

    expect(screen.queryByRole("heading", { name: "Anmeldelse" })).toBeNull();
    expect(screen.queryByLabelText("Anmeldt beløp (kr)")).toBeNull();
    expect(screen.queryByLabelText("Politidistrikt")).toBeNull();
  });
});
