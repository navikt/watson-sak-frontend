import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SakerPåSammePerson } from "./SakerPåSammePerson";

vi.mock("~/kodeverk/useKodeverk", () => ({
  useKodeverk: () => mockKodeverk,
}));

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
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
    ...overrides,
  };
}

async function renderMedRouter(ui: React.ReactNode) {
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
  const resultat = render(<RouterProvider router={router} />);
  await waitFor(() => {});
  return resultat;
}

describe("SakerPåSammePerson", () => {
  it("rendrer ingenting når lista er tom", async () => {
    const { container } = await renderMedRouter(
      <SakerPåSammePerson
        saker={[]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("rendrer ingenting når alle saker er gjeldende sak", async () => {
    const gjeldendeSak = lagKontrollsak("105");
    const { container } = await renderMedRouter(
      <SakerPåSammePerson
        saker={[gjeldendeSak]}
        gjeldendeSak={gjeldendeSak}
        innloggetNavIdent="Z999999"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("viser seksjonsoverskrift og kompakt rad for annen sak", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    expect(screen.getByRole("heading", { name: "Saker på samme person" })).toBeDefined();
    expect(screen.getByText("12345678901", { exact: false })).toBeDefined();
  });

  it("åpner koblingsmodalen fra en ekspandert sak", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    const ekspanderKnapp = screen.getByRole("button", { name: "Vis detaljer" });
    fireEvent.click(ekspanderKnapp);
    await waitFor(() => {});

    fireEvent.click(screen.getByRole("button", { name: "Koble til sak" }));
    await waitFor(() => {});

    expect(screen.getByRole("heading", { name: "Koble til sak" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Skjul" })).toBeDefined();
  });

  it("lenker til den utvidede saken", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer" }));
    await waitFor(() => {});

    expect(screen.getByRole("button", { name: "Gå til sak" }).getAttribute("href")).toBe(
      "/saker/203",
    );
  });

  it("viser identifikatorhistorikk for den utvidede saken", async () => {
    const annenSak = lagKontrollsak("203", {
      historiskeIdenter: [
        { personIdent: "12345678901", type: "FOEDSELSNUMMER", historisk: false },
        { personIdent: "09876543210", type: "FOEDSELSNUMMER", historisk: true },
      ],
    });
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[annenSak]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Vis identifikatorhistorikk" }));
    await waitFor(() => {});

    expect(screen.getByRole("heading", { name: "Identifikatorhistorikk" })).toBeDefined();
    expect(screen.getByText("09876543210")).toBeDefined();
  });

  it("viser feil i koblingsmodalen når innsendingen feiler", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Koble til sak" }));
    await waitFor(() => {});
    fireEvent.click(screen.getAllByRole("button", { name: "Koble til sak" })[1]);
    await waitFor(() => {});

    expect(await screen.findByText("Denne funksjonen er ikke tilgjengelig ennå.")).toBeDefined();
  });

  it("viser frakoblingsmodal for koblede saker", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105", { kobledeSaker: [203] })}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Fjern kobling" }));
    await waitFor(() => {});

    expect(screen.getByRole("heading", { name: "Fjern kobling" })).toBeDefined();
    expect(screen.getByText(/Vil du fjerne koblingen mellom sak.*og sak/)).toBeDefined();
  });

  it("skjuler koblingshandlingen når innlogget bruker ikke er saksbehandler på noen av sakene", async () => {
    const gjeldendeSak = lagKontrollsak("105", {
      saksbehandlere: {
        eier: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "Øst" },
        deltMed: [],
        opprettetAv: { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "Øst" },
      },
    });
    const annenSak = lagKontrollsak("203", {
      saksbehandlere: {
        eier: { navIdent: "Z222222", navn: "Enda en Saksbehandler", enhet: "Øst" },
        deltMed: [],
        opprettetAv: { navIdent: "Z222222", navn: "Enda en Saksbehandler", enhet: "Øst" },
      },
    });

    await renderMedRouter(
      <SakerPåSammePerson
        saker={[annenSak]}
        gjeldendeSak={gjeldendeSak}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer" }));
    await waitFor(() => {});

    expect(screen.queryByRole("button", { name: "Koble til sak" })).toBeNull();
    expect(screen.getByRole("button", { name: "Gå til sak" })).toBeDefined();
  });
});
