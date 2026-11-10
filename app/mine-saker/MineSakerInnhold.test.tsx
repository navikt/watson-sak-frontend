import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { getSaksreferanse } from "~/saker/id";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
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
    { verdi: "AVSLUTTET", etikett: "Avsluttet" },
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
  status: [] as ("INGEN" | "VENTER_PA_INFORMASJON" | "VENTER_PA_VEDTAK")[],
};

type Props = React.ComponentProps<typeof MineSakerInnhold>;

function lagProps(overrides: Partial<Props> = {}): Props {
  return {
    rader: [mapKontrollsakTilSakslisteRad(lagKontrollsak(), "/saker")],
    aktivFane: "mine",
    aktivSide: 1,
    totalAntall: 1,
    totalSider: 0,
    antallMineSaker: 1,
    antallDelteSaker: 0,
    sorteringskolonne: "opprettet",
    sorteringsretning: "desc",
    filterAlternativer: standardFilterAlternativer,
    aktivtFilter: standardAktivtFilter,
    ...overrides,
  };
}

function renderMedRouter(props: Props = lagProps(), startsti = "/") {
  const router = createMemoryRouter([{ path: "/", element: <MineSakerInnhold {...props} /> }], {
    initialEntries: [startsti],
  });

  render(<RouterProvider router={router} />);
  return router;
}

describe("MineSakerInnhold", () => {
  it("viser saksliste med kolonner uten Saksbehandler i Mine saker", () => {
    renderMedRouter();

    expect(screen.getByRole("columnheader", { name: "Saksnummer" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Navn" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Misbrukstype" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Oppdatert" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "Saksbehandler" })).toBeNull();
  });

  it("viser sakslenke med riktig detaljsti", () => {
    renderMedRouter();

    const sakId = 201;
    const lenke = screen.getByRole("link", { name: `${sakId}` });
    expect(lenke.getAttribute("href")).toBe(`/saker/${getSaksreferanse(sakId)}`);
  });

  it("viser steg- og statusfiltre også når listen er tom", () => {
    renderMedRouter(
      lagProps({
        rader: [],
        totalAntall: 0,
        antallMineSaker: 0,
        aktivtFilter: { steg: [], status: ["VENTER_PA_VEDTAK"] },
      }),
    );

    const filterpanel = screen.getByRole("group", { name: "Filtrer saker" });
    expect(within(filterpanel).getByText("Status")).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprettet" })).toBeDefined();
    expect(
      screen.getByRole("button", { name: "Venter på vedtak" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("Endre filtrering for å finne saker")).toBeDefined();
    expect(screen.getByRole("tab", { name: "Mine saker (0)" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Delt med meg (0)" })).toBeDefined();
  });

  it("viser tomtekst når ingen filtre er valgt og ingen saker finnes", () => {
    renderMedRouter(
      lagProps({
        rader: [],
        totalAntall: 0,
        antallMineSaker: 0,
        aktivtFilter: { steg: [], status: [] },
      }),
    );

    expect(screen.getByText("Du har ingen saker.")).toBeDefined();
  });

  it("viser Saksbehandler og backend-paginering kun i Delt med meg", () => {
    const rad = mapKontrollsakTilSakslisteRad(lagKontrollsak({ id: 999 }), "/saker");
    const router = renderMedRouter(
      lagProps({
        rader: [rad],
        aktivFane: "delt",
        aktivSide: 2,
        totalAntall: 26,
        totalSider: 2,
        antallDelteSaker: 26,
      }),
      "/?fane=delt&side=2",
    );

    expect(
      screen.getByRole("tab", { name: "Delt med meg (26)" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("columnheader", { name: "Saksbehandler" })).toBeDefined();
    expect(screen.getByText("Ola Saksbehandler")).toBeDefined();
    expect(screen.getByRole("link", { name: "999" })).toBeDefined();
    expect(screen.getByRole("button", { name: "2" }).getAttribute("aria-current")).toBe("true");
    expect(screen.getByText("26 saker")).toBeDefined();
    expect(router.state.location.search).toContain("fane=delt");
  });

  it("beholder filtre og sortering, men fjerner side ved fanebytte", () => {
    const router = renderMedRouter(
      lagProps({
        aktivtFilter: { steg: ["OPPRETTET"], status: ["VENTER_PA_VEDTAK"] },
      }),
      "/?side=3&steg=OPPRETTET&status=VENTER_PA_VEDTAK&sorter=status&retning=asc",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Delt med meg (0)" }));

    const søk = new URLSearchParams(router.state.location.search);
    expect(søk.get("fane")).toBe("delt");
    expect(søk.has("side")).toBe(false);
    expect(søk.get("steg")).toBe("OPPRETTET");
    expect(søk.get("status")).toBe("VENTER_PA_VEDTAK");
    expect(søk.get("sorter")).toBe("status");
    expect(søk.get("retning")).toBe("asc");
  });

  it("oppdaterer side i URL-en når brukeren bytter side", () => {
    const router = renderMedRouter(lagProps({ totalSider: 2 }));

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(new URLSearchParams(router.state.location.search).get("side")).toBe("2");
  });

  it("går til første side ved sortering", () => {
    const router = renderMedRouter(lagProps({ totalSider: 2 }), "/?side=2");

    fireEvent.click(
      within(screen.getByRole("columnheader", { name: "Saksnummer" })).getByRole("button"),
    );

    const søk = new URLSearchParams(router.state.location.search);
    expect(søk.has("side")).toBe(false);
    expect(søk.get("sorter")).toBe("saksid");
    expect(søk.get("retning")).toBe("asc");
  });

  it("går til første side ved filtrering", () => {
    const router = renderMedRouter(lagProps({ totalSider: 2 }), "/?side=2");

    fireEvent.click(screen.getByRole("button", { name: "Utredning" }));

    expect(new URLSearchParams(router.state.location.search).has("side")).toBe(false);
  });
});
