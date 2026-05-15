import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { lagMockSakId } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { MineSakerInnhold } from "./MineSakerInnhold";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakId("201", 2),
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "OPPRETTET",
    kategori: "ARBEID",
    kilde: "PUBLIKUM",
    misbruktype: ["FEIL_INNTEKTSGRUNNLAG"],
    prioritet: "NORMAL",
    blokkert: null,
    ytelser: [
      {
        id: "ytelse-1",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
    ],
    merking: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
    ...overrides,
  };
}

const standardFilterAlternativer = {
  status: [
    { verdi: "OPPRETTET", etikett: "Opprettet" },
    { verdi: "UTREDES", etikett: "Utredes" },
    { verdi: "STRAFFERETTSLIG_VURDERING", etikett: "Strafferettslig vurdering" },
    { verdi: "ANMELDT", etikett: "Anmeldt" },
    { verdi: "HENLAGT", etikett: "Henlagt" },
    { verdi: "AVSLUTTET", etikett: "Avsluttet" },
  ],
  ventestatus: [
    { verdi: "INGEN", etikett: "Ingen" },
    { verdi: "VENTER_PA_INFORMASJON", etikett: "Venter på informasjon" },
    { verdi: "VENTER_PA_VEDTAK", etikett: "Venter på vedtak" },
    { verdi: "I_BERO", etikett: "I bero" },
  ],
};

const standardAktivtFilter = {
  status: ["OPPRETTET" as const, "UTREDES" as const, "STRAFFERETTSLIG_VURDERING" as const],
  ventestatus: ["INGEN" as const, "VENTER_PA_INFORMASJON" as const],
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
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    const sakId = lagMockSakId("201", 2);
    const lenke = screen.getByRole("link", { name: String(sakId) });
    expect(lenke.getAttribute("href")).toBe(`/saker/${getSaksreferanse(sakId)}`);
  });

  it("viser Chips-filtre for status og ventestatus", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[lagKontrollsak()]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    expect(screen.getByText("Ventestatus")).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Utredes" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ingen" })).toBeDefined();
    expect(screen.getByRole("button", { name: "I bero" })).toBeDefined();
  });

  it("viser tomtekst når ingen saker matcher filter", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    expect(screen.getByText("Ingen saker matcher valgte filtre.")).toBeDefined();
  });

  it("markerer aktive filtre som selected", () => {
    renderMedRouter(
      <MineSakerInnhold
        saker={[lagKontrollsak()]}
        detaljSti="/saker"
        filterAlternativer={standardFilterAlternativer}
        aktivtFilter={standardAktivtFilter}
      />,
    );

    const opprettetChip = screen.getByRole("button", { name: "Opprettet" });
    expect(opprettetChip.getAttribute("aria-pressed")).toBe("true");

    const avsluttetChip = screen.getByRole("button", { name: "Avsluttet" });
    expect(avsluttetChip.getAttribute("aria-pressed")).toBe("false");
  });
});
