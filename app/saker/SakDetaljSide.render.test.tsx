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
  }),
}));

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    enhet: "4812",
  }),
}));

vi.mock("~/kodeverk/useKodeverk", () => ({
  useKodeverk: () => mockKodeverk,
}));

const testRequest = new Request("http://localhost");
const testSakId = "201";
const deltMedSakId = "101";

function renderDetaljside(sakId = testSakId) {
  const router = createMemoryRouter(
    [
      {
        path: "/saker/:sakId",
        loader: ({ params }) =>
          loader({ request: testRequest, params: { sakId: params.sakId ?? sakId } } as never),
        Component: SakDetaljSide,
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
  });

  it("viser lagre og avbryt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Rediger saksinformasjon" }));

    expect(await screen.findByRole("button", { name: "Lagre" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeDefined();
    expect(screen.getByLabelText("Kategori")).toBeDefined();
  }, 15000);

  it("viser misbruktype når kategori byttes til en kategori med misbrukstyper", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Rediger saksinformasjon" }));
    fireEvent.change(await screen.findByLabelText("Kategori"), {
      target: { value: "ARBEID" },
    });

    expect(await screen.findByLabelText("Misbruktype")).toBeDefined();
  }, 15000);

  it("viser saksbehandler med delte brukere, men skjuler handlinger og fjern-knapper for ikke-eier", async () => {
    renderDetaljside(deltMedSakId);

    const saksbehandlereHeading = await screen.findByRole("heading", { name: "Saksbehandler" });

    expect(saksbehandlereHeading).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Handlinger" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Delt med" })).toBeDefined();
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

  it("viser organisasjonsnummer-felt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Rediger saksinformasjon" }));

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
