import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SakerPåSammePerson } from "./SakerPåSammePerson";

function lagKontrollsak(
  idNum: string,
  overrides: Partial<KontrollsakResponse> = {},
): KontrollsakResponse {
  return {
    id: Number(idNum),
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
        belop: null,
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
      <SakerPåSammePerson saker={[]} gjeldendeSak={lagKontrollsak("105")} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("rendrer ingenting når alle saker er gjeldende sak", () => {
    const gjeldendeSak = lagKontrollsak("105");
    const { container } = renderMedRouter(
      <SakerPåSammePerson saker={[gjeldendeSak]} gjeldendeSak={gjeldendeSak} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("viser seksjonsoverskrift og kompakt rad for annen sak", () => {
    renderMedRouter(
      <SakerPåSammePerson saker={[lagKontrollsak("203")]} gjeldendeSak={lagKontrollsak("105")} />,
    );

    expect(screen.getByRole("heading", { name: "Saker på samme person" })).toBeDefined();
    expect(screen.getByText("12345678901", { exact: false })).toBeDefined();
  });

  it("åpner koblingsmodalen fra en ekspandert sak", () => {
    renderMedRouter(
      <SakerPåSammePerson saker={[lagKontrollsak("203")]} gjeldendeSak={lagKontrollsak("105")} />,
    );

    const ekspanderKnapp = screen.getByRole("button", { name: "Vis detaljer" });
    fireEvent.click(ekspanderKnapp);

    fireEvent.click(screen.getByRole("button", { name: "Koble til sak" }));

    expect(screen.getByRole("heading", { name: "Koble til sak" })).toBeDefined();
    expect(screen.getByText("Lurt å vite før du kobler")).toBeDefined();
    expect(screen.getByRole("button", { name: "Skjul" })).toBeDefined();
  });

  it("viser feil i koblingsmodalen når innsendingen feiler", async () => {
    renderMedRouter(
      <SakerPåSammePerson saker={[lagKontrollsak("203")]} gjeldendeSak={lagKontrollsak("105")} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer" }));
    fireEvent.click(screen.getByRole("button", { name: "Koble til sak" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Koble til sak" })[1]);

    expect(await screen.findByText("Denne funksjonen er ikke tilgjengelig ennå.")).toBeDefined();
  });

  it("viser frakoblingsmodal for koblede saker", () => {
    renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105", { kobledeSaker: [203] })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer" }));
    fireEvent.click(screen.getByRole("button", { name: "Fjern kobling" }));

    expect(screen.getByRole("heading", { name: "Fjern kobling" })).toBeDefined();
    expect(screen.getByText(/mister tilgangen til hverandres saker/)).toBeDefined();
  });
});
