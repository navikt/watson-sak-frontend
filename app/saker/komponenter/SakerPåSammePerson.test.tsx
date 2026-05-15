import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { lagMockSakId } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SakerPåSammePerson } from "./SakerPåSammePerson";

function lagKontrollsak(
  idNum: string,
  overrides: Partial<KontrollsakResponse> = {},
): KontrollsakResponse {
  return {
    id: lagMockSakId(idNum, 1),
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
    ytelser: [
      {
        id: crypto.randomUUID(),
        type: "Foreldrepenger",
        periodeFra: "2022-01-01",
        periodeTil: "2025-01-01",
        belop: null,
      },
    ],
    merking: null,
    opprettet: "2026-02-01T00:00:00Z",
    oppdatert: null,
    oppgaver: [],
    ...overrides,
  };
}

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: ui,
        action: async () => ({
          ok: false as const,
          feil: { skjema: ["Denne funksjonen er ikke tilgjengelig ennå."] },
        }),
      },
    ],
    {
      initialEntries: ["/"],
    },
  );
  return render(<RouterProvider router={router} />);
}

describe("SakerPåSammePerson", () => {
  it("rendrer ingenting når lista er tom", () => {
    const { container } = renderMedRouter(
      <SakerPåSammePerson saker={[]} gjeldendeSakId={lagMockSakId("105", 1)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("rendrer ingenting når alle saker er gjeldende sak", () => {
    const sakId = lagMockSakId("105", 1);
    const { container } = renderMedRouter(
      <SakerPåSammePerson saker={[lagKontrollsak("105")]} gjeldendeSakId={sakId} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("viser seksjonsoverskrift og kompakt rad for annen sak", () => {
    renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSakId={lagMockSakId("105", 1)}
      />,
    );

    expect(screen.getByRole("heading", { name: "Saker på samme person" })).toBeDefined();
    expect(screen.getByText("12345678901", { exact: false })).toBeDefined();
  });

  it("ekspanderer og viser Koble til saken-knapp ved klikk", () => {
    renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSakId={lagMockSakId("105", 1)}
      />,
    );

    const ekspanderKnapp = screen.getByRole("button", { name: "Vis detaljer" });
    fireEvent.click(ekspanderKnapp);

    expect(screen.getByRole("button", { name: "Koble til saken" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Skjul" })).toBeDefined();
  });

  it("viser lokal feilmelding når koble til saken ikke er tilgjengelig", async () => {
    renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSakId={lagMockSakId("105", 1)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer" }));
    fireEvent.click(screen.getByRole("button", { name: "Koble til saken" }));

    expect(await screen.findByText("Denne funksjonen er ikke tilgjengelig ennå.")).toBeDefined();
  });
});
