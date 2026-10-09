import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { MineSakerInnhold } from "./MineSakerInnhold";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 201,
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    steg: "OPPRETTET",
    kategori: "ARBEID",
    kilde: "PUBLIKUM",
    misbruktype: ["FEIL_INNTEKTSGRUNNLAG"],
    prioritet: "NORMAL",
    status: null,
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

const standardFilterAlternativer = {
  steg: [
    { verdi: "OPPRETTET", etikett: "Opprettet" },
    { verdi: "UTREDNING", etikett: "Utredning" },
    { verdi: "FORVALTNING", etikett: "Forvaltning" },
    { verdi: "STRAFFERETTSLIG_VURDERING", etikett: "Strafferettslig vurdering" },
    { verdi: "POLITI", etikett: "Politi" },
  ],
  status: [
    { verdi: "INGEN", etikett: "Aktiv" },
    { verdi: "VENTER_PA_INFORMASJON", etikett: "Venter på informasjon" },
    { verdi: "VENTER_PA_VEDTAK", etikett: "Venter på vedtak" },
    { verdi: "VENTER_PA_RESULTAT", etikett: "Venter på resultat" },
    { verdi: "I_BERO", etikett: "I bero" },
  ],
};

const standardAktivtFilter = {
  steg: [
    "OPPRETTET" as const,
    "UTREDNING" as const,
    "FORVALTNING" as const,
    "STRAFFERETTSLIG_VURDERING" as const,
  ],
  status: ["INGEN" as const, "VENTER_PA_INFORMASJON" as const],
};

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("MineSakerInnhold", () => {
  it("viser saksliste med kolonner", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[lagKontrollsak()]}
        deltMedSaker={[]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Saksid" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Navn" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Misbrukstype" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Oppdatert" })).toBeDefined();
  });

  it("viser sakslenke med riktig detaljsti", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[lagKontrollsak()]}
        deltMedSaker={[]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    const sakId = 201;
    const lenke = screen.getByRole("link", { name: `#${sakId}` });
    expect(lenke.getAttribute("href")).toBe(`/saker/${getSaksreferanse(sakId)}`);
  });

  it("viser Chips-filtre for steg og status", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[lagKontrollsak()]}
        deltMedSaker={[]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    expect(
      within(screen.getByRole("group", { name: "Filtrer saker" })).getByText("Status"),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Utredning" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Avsluttet" })).toBeNull();
    expect(screen.getByRole("button", { name: "Aktiv" })).toBeDefined();
    expect(screen.getByRole("button", { name: "I bero" })).toBeDefined();
  });

  it("viser tomtekst når ingen saker matcher filter", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[]}
        deltMedSaker={[]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    expect(screen.getByText("Endre filtrering for å finne saker")).toBeDefined();
  });

  it("viser tilpasset tomtekst når ingen filtre er valgt og ingen saker finnes", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[]}
        deltMedSaker={[]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={{
          steg: [],
          status: [],
        }}
      />,
    );

    expect(screen.getByText("Du har ingen saker.")).toBeDefined();
  });

  it("markerer aktive filtre som selected", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[lagKontrollsak()]}
        deltMedSaker={[]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    const opprettetChip = screen.getByRole("button", { name: "Opprettet" });
    expect(opprettetChip.getAttribute("aria-pressed")).toBe("true");

    expect(screen.queryByRole("button", { name: "Avsluttet" })).toBeNull();
  });

  it("viser 'Delt med meg'-seksjon når det finnes delt-med-saker", () => {
    const deltSak = lagKontrollsak({ id: 999 });
    renderMedRouter(
      <MineSakerInnhold
        saker={[]}
        deltMedSaker={[deltSak]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    expect(screen.getByRole("heading", { name: "Delt med meg" })).toBeDefined();
  });

  it("skjuler 'Delt med meg'-seksjon når ingen saker er delt", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[lagKontrollsak()]}
        deltMedSaker={[]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    expect(screen.queryByRole("heading", { name: "Delt med meg" })).toBeNull();
  });

  describe("sidedeling", () => {
    // 25 saker der sak 1 er nyest, slik at standardsorteringen (opprettet, synkende) gir id 1–25.
    const mangeSaker = Array.from({ length: 25 }, (_, indeks) =>
      lagKontrollsak({
        id: indeks + 1,
        opprettet: new Date(Date.UTC(2026, 0, 31 - indeks)).toISOString(),
      }),
    );

    function renderMedSider(søkestreng = "") {
      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: (
              <MineSakerInnhold
                saker={mangeSaker}
                deltMedSaker={[]}
                detaljSti="/saker"
                filterAlternativer={standardFilterAlternativer}
                aktivtFilter={standardAktivtFilter}
              />
            ),
          },
        ],
        { initialEntries: [`/${søkestreng}`] },
      );
      render(<RouterProvider router={router} />);
      return router;
    }

    function synligeSakslenker() {
      return screen.getAllByRole("link", { name: /^#\d+$/ });
    }

    it("viser 20 saker på første side", () => {
      renderMedSider();

      const lenker = synligeSakslenker();
      expect(lenker).toHaveLength(20);
      expect(lenker[0].textContent).toBe("#1");
      expect(lenker[19].textContent).toBe("#20");
    });

    it("viser resten av sakene når side=2", () => {
      renderMedSider("?side=2");

      const lenker = synligeSakslenker();
      expect(lenker).toHaveLength(5);
      expect(lenker[0].textContent).toBe("#21");
    });

    it("oppdaterer side i URL-en ved sidebytte", () => {
      const router = renderMedSider();

      fireEvent.click(screen.getByRole("button", { name: "2" }));

      expect(router.state.location.search).toContain("side=2");
      expect(synligeSakslenker()[0].textContent).toBe("#21");
    });

    it("går tilbake til første side ved sortering", () => {
      const router = renderMedSider("?side=2");

      fireEvent.click(
        within(screen.getByRole("columnheader", { name: "Saksid" })).getByRole("button"),
      );

      expect(new URLSearchParams(router.state.location.search).has("side")).toBe(false);
    });

    it("går tilbake til første side ved filtrering", () => {
      const router = renderMedSider("?side=2");

      fireEvent.click(screen.getByRole("button", { name: "Utredning" }));

      expect(new URLSearchParams(router.state.location.search).has("side")).toBe(false);
    });
  });
});
