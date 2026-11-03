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

async function renderMedRouter(ui: React.ReactNode, tekniskFeil = false) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: ui,
        action: async () =>
          tekniskFeil
            ? { ok: false as const, feil: "Intern feil", feilId: "ERR-123", teknisk: true as const }
            : {
                ok: false as const,
                feil: { skjema: ["Denne funksjonen er ikke tilgjengelig ennå."] },
              },
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

  it("viser saksoppsummering og handlinger i kompakt visning", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    expect(screen.getByRole("heading", { name: "Saker på samme person" })).toBeDefined();
    expect(screen.getByText((_, element) => element?.textContent === "Saksid: 203")).toBeDefined();
    expect(screen.getByText((_, element) => element?.textContent === "Enhet: Øst")).toBeDefined();
    expect(
      screen.getByText((_, element) => element?.textContent === "Saksbehandler: Lise Raus"),
    ).toBeDefined();
    expect(screen.getByText("Utredning")).toBeDefined();
    expect(screen.getByRole("button", { name: "Vis detaljer for sak 203" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Gå til sak" })).toBeDefined();
  });

  it("viser steget og ikke statusen for sakene", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[
          lagKontrollsak("203"),
          lagKontrollsak("204", { steg: "STRAFFERETTSLIG_VURDERING", status: "VENTER_PA_VEDTAK" }),
        ]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    expect(screen.getByText((_, element) => element?.textContent === "Saksid: 203")).toBeDefined();
    expect(screen.getByText((_, element) => element?.textContent === "Saksid: 204")).toBeDefined();
    expect(screen.getByText("Utredning")).toBeDefined();
    expect(screen.queryByText("Venter på vedtak")).toBeNull();
  });

  it("viser resultatet for avsluttede saker", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[
          lagKontrollsak("203", {
            steg: "AVSLUTTET",
            resultat: { utredning: { type: "HENLAGT" } } as KontrollsakResponse["resultat"],
          }),
        ]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    expect(screen.getByText("Henlagt")).toBeDefined();
    expect(screen.queryByText("Avsluttet")).toBeNull();
  });

  it("viser saksfeltene i utvidet visning", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[
          lagKontrollsak("203", {
            ytelser: [
              {
                type: "Foreldrepenger",
                periodeFra: "2022-01-01",
                periodeTil: "2025-01-01",
                belop: 50000,
                endeligBelop: null,
              },
              {
                type: "Dagpenger",
                periodeFra: "2023-03-01",
                periodeTil: "2024-06-30",
                belop: null,
                endeligBelop: null,
              },
            ],
          }),
        ]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer for sak 203" }));

    expect(screen.getByText("Kategori")).toBeDefined();
    expect(screen.getByText("Periode")).toBeDefined();
    expect(screen.getByText("01.01.2022 – 01.01.2025")).toBeDefined();
    expect(screen.getByText("01.03.2023 – 30.06.2024")).toBeDefined();
    expect(screen.queryByText("01.2022–01.2025")).toBeNull();
    expect(screen.getByText("Ca beløp")).toBeDefined();
    expect(screen.getByText(/50\s000/)).toBeDefined();
    expect(screen.getByText("Ytelse")).toBeDefined();
    expect(screen.getByText("Kilde")).toBeDefined();
    expect(screen.getByText("Fødselsnummer")).toBeDefined();
  });

  it("beholder øvrige saksopplysninger i utvidet visning", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[
          lagKontrollsak("203", {
            legacyPid: "PID-123",
            arbeidsgivere: ["123456789"],
            ytelser: [
              {
                type: "Foreldrepenger",
                periodeFra: "2022-01-01",
                periodeTil: "2025-01-01",
                belop: 50000,
                endeligBelop: 40000,
              },
            ],
          }),
        ]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer for sak 203" }));

    expect(screen.getByText("PID")).toBeDefined();
    expect(screen.getByText("PID-123")).toBeDefined();
    expect(screen.getByText("Organisasjonsnummer")).toBeDefined();
    expect(screen.getByText("123 456 789")).toBeDefined();
    expect(screen.getByText("Endelig beløp")).toBeDefined();
    expect(screen.getByText(/40\s000/)).toBeDefined();
  });

  it("åpner koblingsmodalen fra en ekspandert sak", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    const ekspanderKnapp = screen.getByRole("button", { name: "Vis detaljer for sak 203" });
    fireEvent.click(ekspanderKnapp);
    await waitFor(() => {});

    fireEvent.click(screen.getByRole("button", { name: "Koble til sak" }));
    await waitFor(() => {});

    expect(screen.getByRole("heading", { name: "Koble til sak" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Skjul detaljer for sak 203" })).toBeDefined();
  });

  it("lenker til den utvidede saken", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer for sak 203" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer for sak 203" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer for sak 203" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Koble til sak" }));
    await waitFor(() => {});
    fireEvent.click(screen.getAllByRole("button", { name: "Koble til sak" })[1]);
    await waitFor(() => {});

    expect(await screen.findByText("Denne funksjonen er ikke tilgjengelig ennå.")).toBeDefined();
  });

  it("viser kontekstuell feilmelding ved teknisk feil i koblingen", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105")}
        innloggetNavIdent="Z999999"
      />,
      true,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer for sak 203" }));
    fireEvent.click(screen.getByRole("button", { name: "Koble til sak" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Koble til sak" })[1]);

    expect(await screen.findByText("Vi fikk ikke lagret endringen")).toBeDefined();
    expect(screen.getByText("ERR-123")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Koble til sak" })).toBeDefined();

    // Lukk og åpne på nytt: den gamle feilen skal ikke vises før et nytt forsøk.
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Koble til sak" })).toBeNull(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Koble til sak" }));
    expect(await screen.findByRole("heading", { name: "Koble til sak" })).toBeDefined();
    expect(screen.queryByText("Vi fikk ikke lagret endringen")).toBeNull();
  });

  it("viser frakoblingsmodal for koblede saker", async () => {
    await renderMedRouter(
      <SakerPåSammePerson
        saker={[lagKontrollsak("203")]}
        gjeldendeSak={lagKontrollsak("105", { kobledeSaker: [203] })}
        innloggetNavIdent="Z999999"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer for sak 203" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Vis detaljer for sak 203" }));
    await waitFor(() => {});

    expect(screen.queryByRole("button", { name: "Koble til sak" })).toBeNull();
    expect(screen.getByRole("button", { name: "Gå til sak" })).toBeDefined();
  });
});
