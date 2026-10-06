import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import SakDetaljSide, { loader } from "./SakDetaljSide.route";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
  env: { ENVIRONMENT: "local-mock" },
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: async () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    preferredUsername: "test@nav.no",
    enhet: "4812",
    erLeder,
  }),
}));

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    enhet: "4812",
    erLeder,
  }),
}));

vi.mock("~/kodeverk/useKodeverk", () => ({
  useKodeverk: () => mockKodeverk,
}));

const visningsmiljø = vi.hoisted(() => ({ verdi: "local-mock" }));
vi.mock("~/miljø/useMiljø", () => ({
  useMiljø: () => visningsmiljø.verdi,
}));

const testRequest = new Request("http://localhost");
const testSakId = "201";
const deltMedSakId = "101";
let erLeder = false;

function renderDetaljside(sakId = testSakId) {
  const router = createMemoryRouter(
    [
      {
        path: "/saker/:sakId",
        loader: ({ params }) =>
          loader({ request: testRequest, params: { sakId: params.sakId ?? sakId } } as never),
        Component: SakDetaljSide,
        HydrateFallback: () => null,
      },
    ],
    {
      initialEntries: [`/saker/${sakId}`],
    },
  );

  return render(<RouterProvider router={router} />);
}

describe("SakDetaljSide render", () => {
  beforeEach(() => {
    resetDefaultSession();
    erLeder = false;
    visningsmiljø.verdi = "local-mock";
  });

  it("viser lagre og avbryt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Endre saksinformasjon" }));

    expect(await screen.findByRole("button", { name: "Lagre" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeDefined();
    expect(screen.getByLabelText("Kategori")).toBeDefined();
  }, 15000);

  it("viser misbruktype når kategori byttes til en kategori med misbrukstyper", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Endre saksinformasjon" }));
    fireEvent.change(await screen.findByLabelText("Kategori"), {
      target: { value: "ARBEID" },
    });

    expect(await screen.findByLabelText("Misbruktype")).toBeDefined();
  }, 15000);

  it("viser saksbehandler med delte brukere, men skjuler handlinger og fjern-knapper for ikke-eier", async () => {
    renderDetaljside(deltMedSakId);

    expect((await screen.findAllByText("Saksbehandler")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Handlinger" })).toBeNull();
    expect(screen.getByText("Delt tilgang")).toBeDefined();
    expect(screen.getByText("Ingen ansvarlig saksbehandler satt.")).toBeDefined();
    expect(screen.getAllByText("Kari Nordmann").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ada Larsen").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fjern deling med Kari Nordmann" })).toBeNull();
  }, 15000);

  it("viser tilgangsmelding for historikk (og skjuler Tildel meg) for skjermet sak som krever utvidet tilgang", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const sak = hentAlleSaker(hentMockState(testRequest)).find(
      (s) => s.id === Number(deltMedSakId),
    );
    if (!sak) {
      throw new Error("Fant ikke testdata for sak");
    }

    sak.adresseskjermet = true;
    sak.saksbehandlere.eier = null;
    // Gi innlogget bruker (Z999999) direkte tilgang (delt-med) slik at vi isolerer
    // skjermet-sak-effekten (sak.tilgang.kanSeHistorikk) fra harDirekteTilgang-sjekken.
    sak.saksbehandlere.deltMed = [
      { navIdent: "Z999999", navn: "Test Saksbehandler", enhet: "4812" },
    ];
    (
      sak as unknown as {
        tilgang?: {
          kreverUtvidetTilgang: boolean;
          kanSeHistorikk: boolean;
          kanSeRelaterteSaker: boolean;
          kanTildeleSak: boolean;
        };
      }
    ).tilgang = {
      kreverUtvidetTilgang: true,
      kanSeHistorikk: false,
      kanSeRelaterteSaker: false,
      kanTildeleSak: false,
    };

    renderDetaljside(deltMedSakId);

    await screen.findByRole("heading", { level: 1, name: /^Sak / });
    expect(
      await screen.findByText(
        "Denne saken er skjermet. Du må ha utvidet tilgang for å se historikk.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Tildel meg" })).toBeNull();
  }, 15000);

  it("viser tilgangsmelding for historikk når innlogget bruker verken er eier eller delt-med", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const koblingSakId = "102";
    const koblingSak = hentAlleSaker(hentMockState(testRequest)).find(
      (s) => s.id === Number(koblingSakId),
    );
    if (!koblingSak) {
      throw new Error("Fant ikke testdata for koblingssak");
    }
    // Se tilsvarende Filer-test lenger ned for forklaring av oppsettet: sak 102 har
    // verken eier eller delt-med som er innlogget bruker (Z999999) fra før.
    koblingSak.kobledeSaker = [Number(testSakId)];

    renderDetaljside(koblingSakId);

    expect(
      await screen.findByText("Du må få delt tilgang til saken for å kunne se historikk."),
    ).toBeDefined();
  }, 15000);

  it("viser organisasjonsnummer i read-only-visning når det er satt", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const saker = hentAlleSaker(hentMockState(testRequest));
    const sak = saker.find((s) => s.id === Number(deltMedSakId));
    if (sak) sak.arbeidsgivere = ["987654321"];

    renderDetaljside(deltMedSakId);

    expect(await screen.findByText("987 654 321")).toBeDefined();
    expect(screen.getByText("Organisasjonsnummer")).toBeDefined();
  }, 15000);

  it("skjuler organisasjonsnummer-felt i read-only når ingen arbeidsgivere er satt", async () => {
    renderDetaljside();

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Organisasjonsnummer")).toBeNull();
  }, 15000);

  it.each(["local-mock"])(
    "viser deaktivert ferdigkontroll og notat i %s",
    async (miljø) => {
      visningsmiljø.verdi = miljø;
      const { hentMockState } = await import("~/testing/mock-store/session.server");
      const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
      const sak = hentAlleSaker(hentMockState(testRequest)).find((s) => s.id === Number(testSakId));
      if (!sak) throw new Error("Fant ikke testdata for migreringssak");
      sak.legacyPid = "100245";
      sak.legacyKilde = "UTREDNING";

      renderDetaljside();
      const kontroll = await screen.findByRole("checkbox", { name: "Saken er ferdig flyttet" });
      expect((kontroll as HTMLInputElement).disabled).toBe(true);
      expect(screen.getByText(/Ferdigmerking kan ikke lagres/)).toBeDefined();
      expect(screen.getByText("Migreringsnotat (forhåndsvisning)")).toBeDefined();
    },
    15000,
  );

  it("viser avkrysning for ansvarlig i lokal backend uten migreringsnotat-placeholder", async () => {
    visningsmiljø.verdi = "local-backend";
    renderDetaljside("1182");

    const kontroll = await screen.findByRole("checkbox", { name: "Saken er ferdig flyttet" });
    expect((kontroll as HTMLInputElement).disabled).toBe(false);
    expect((kontroll as HTMLInputElement).name).toBe("bekreftet");
    expect(screen.getByText(/Marker saken som ferdig flyttet når alle dokumenter/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Merk som ferdig flyttet" })).toBeNull();
    expect(screen.queryByText("Migreringsnotat (forhåndsvisning)")).toBeNull();
  }, 15000);

  it("sender ferdigmeldingen når avkrysningen slås på, og ikke når den slås av", async () => {
    visningsmiljø.verdi = "local-backend";
    const requestSubmit = vi.fn();
    const original = HTMLFormElement.prototype.requestSubmit;
    HTMLFormElement.prototype.requestSubmit = requestSubmit;
    try {
      renderDetaljside("1182");
      const kontroll = await screen.findByRole("checkbox", { name: "Saken er ferdig flyttet" });

      fireEvent.click(kontroll);
      expect(requestSubmit).toHaveBeenCalledTimes(1);

      fireEvent.click(kontroll);
      expect(requestSubmit).toHaveBeenCalledTimes(1);
    } finally {
      HTMLFormElement.prototype.requestSubmit = original;
    }
  }, 15000);

  it("viser ferdig migrert mock-sak med notat under Filer og grønn eksempelbekreftelse", async () => {
    renderDetaljside("1181");

    const notatlenke = await screen.findByRole("link", { name: "Notat fra opprettelse" });
    expect(notatlenke.getAttribute("href")).toBe("/saker/1181/dokumenter/1181-migrering");
    expect(
      screen.getByText("Eksempelnotat for migrering. Kun syntetisk testinnhold."),
    ).toBeDefined();
    expect(screen.getByText("Saken er ferdig flyttet 🎉")).toBeDefined();
    expect(screen.getByText("Saken er overført til Watson Sak.")).toBeDefined();
    expect(screen.getByText(/ingen ferdigmelding er lagret i backend/i)).toBeDefined();
    expect(screen.getByText(/Notat · Opprettet i Watson Sak/)).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: "Saken er ferdig flyttet" })).toBeNull();
    expect(screen.queryByText("Migreringsnotat (forhåndsvisning)")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Lukk bekreftelsen" }));
    expect(screen.queryByText("Saken er ferdig flyttet 🎉")).toBeNull();
    expect(screen.getByRole("link", { name: "Notat fra opprettelse" })).toBeDefined();
  }, 15000);

  it("utleverer ikke mockstatus for migreringssak som eies av en annen", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const sak = hentAlleSaker(hentMockState(testRequest)).find((s) => s.id === 1181);
    if (!sak) throw new Error("Fant ikke syntetisk migreringssak");
    sak.saksbehandlere.eier = { navIdent: "Z000001", navn: "Annen saksbehandler", enhet: "4812" };

    renderDetaljside("1181");
    await screen.findByRole("heading", { name: /^Sak 1181/ });
    expect(screen.queryByText("Saken er ferdig flyttet 🎉")).toBeNull();
    expect(screen.queryByRole("link", { name: "Notat fra opprettelse" })).toBeNull();
  }, 15000);

  it("viser uferdig mock-sak uten grønn bekreftelse", async () => {
    renderDetaljside("1182");

    const kontroll = await screen.findByRole("checkbox", { name: "Saken er ferdig flyttet" });
    expect((kontroll as HTMLInputElement).checked).toBe(false);
    expect(screen.queryByText(/Syntetisk eksempel/)).toBeNull();
    expect(screen.getByText("Migreringsnotat (forhåndsvisning)")).toBeDefined();
  }, 15000);

  it("viser Filer-blokken for sak man er eier av", async () => {
    renderDetaljside();

    expect(await screen.findByRole("heading", { name: "Filer" })).toBeDefined();
    expect(
      screen.queryByText("Du må få delt tilgang til saken for å kunne se dokumenter og vedlegg."),
    ).toBeNull();
  }, 15000);

  it("skjuler Filer-blokken og viser tilgangsmelding for koblet sak uten direkte tilgang", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const koblingSakId = "102";
    const koblingSak = hentAlleSaker(hentMockState(testRequest)).find(
      (s) => s.id === Number(koblingSakId),
    );
    if (!koblingSak) {
      throw new Error("Fant ikke testdata for koblingssak");
    }
    // Sak 102 har verken eier eller delt-med som er innlogget bruker (Z999999) fra
    // før, men kobles her til sak 201 (som Z999999 eier) for å simulere
    // "ansvarlig på koblet sak" — en rolle som får fil-tilgang i backend, men som
    // ikke skal kunne se filområdet på sakssiden (se IngenFiltilgangKort).
    koblingSak.kobledeSaker = [Number(testSakId)];

    renderDetaljside(koblingSakId);

    expect(
      await screen.findByText(
        "Du må få delt tilgang til saken for å kunne se dokumenter og vedlegg.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Filer" })).toBeNull();
  }, 15000);

  it("viser filer og historikk for leder uten direkte tilgang", async () => {
    erLeder = true;

    renderDetaljside("102");

    expect(await screen.findByRole("heading", { name: "Filer" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Historikk" })).toBeDefined();
    expect(
      screen.queryByText("Du må få delt tilgang til saken for å kunne se dokumenter og vedlegg."),
    ).toBeNull();
    expect(
      screen.queryByText("Du må få delt tilgang til saken for å kunne se historikk."),
    ).toBeNull();
  }, 15000);

  it("viser organisasjonsnummer-felt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Endre saksinformasjon" }));

    expect(await screen.findByText("Organisasjonsnummer (valgfritt)")).toBeDefined();
  }, 15000);

  it("viser Diskresjon-badge når saken har adresseskjermet=true", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const sak = hentAlleSaker(hentMockState(testRequest)).find((s) => s.id === Number(testSakId));
    if (sak) sak.adresseskjermet = true;

    renderDetaljside();

    expect(await screen.findByText("Diskresjon")).toBeDefined();
  }, 15000);

  it("skjuler Diskresjon-badge når saken har adresseskjermet=false", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const sak = hentAlleSaker(hentMockState(testRequest)).find((s) => s.id === Number(testSakId));
    if (sak) sak.adresseskjermet = false;

    renderDetaljside();

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Diskresjon")).toBeNull();
  }, 15000);
});
