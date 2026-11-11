import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteConfig } from "~/routeConfig";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import SakDetaljSide, { ErrorBoundary, loader } from "./SakDetaljSide.route";

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

function renderDetaljside(sakId = testSakId, query = "") {
  const router = createMemoryRouter(
    [
      {
        path: "/saker/:sakId",
        loader: ({ params }) =>
          loader({
            request: new Request(`http://localhost/saker/${params.sakId ?? sakId}${query}`),
            params: { sakId: params.sakId ?? sakId },
          } as never),
        Component: SakDetaljSide,
        ErrorBoundary,
        HydrateFallback: () => null,
      },
      {
        path: RouteConfig.MINE_SAKER,
        Component: () => <h1>Mine saker</h1>,
      },
    ],
    {
      initialEntries: [`/saker/${sakId}`],
    },
  );

  return { ...render(<RouterProvider router={router} />), router };
}

describe("SakDetaljSide render", () => {
  beforeEach(() => {
    const lager = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (nøkkel: string) => lager.get(nøkkel) ?? null,
      setItem: (nøkkel: string, verdi: string) => void lager.set(nøkkel, verdi),
      removeItem: (nøkkel: string) => void lager.delete(nøkkel),
      clear: () => lager.clear(),
    });
    resetDefaultSession();
    erLeder = false;
    visningsmiljø.verdi = "local-mock";
  });

  it("viser lagre og avbryt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Endre saksinformasjon" }));

    expect(await screen.findByRole("button", { name: "Lagre" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeDefined();
    expect(screen.getByLabelText("Kategori (må fylles ut)")).toBeDefined();
  }, 15000);

  it.each([
    [
      "AVVIST_SKJERMING",
      "Du har bedt om tilgang til å se informasjon om en person som er ansatt i Nav.",
    ],
    ["AVVIST_HABILITET", "Du har bedt om tilgang til å se informasjon om en person."],
    ["AVVIST_VERGE", "Du har bedt om tilgang til å se informasjon om en person."],
  ] as const)(
    "viser avvisningsside for %s uten saksdata",
    async (avvisningsgrunn, tekst) => {
      renderDetaljside(testSakId, `?mockAvvisningsgrunn=${avvisningsgrunn}`);

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: "Du har ikke tilgang til denne saken",
        }),
      ).toBeDefined();
      expect(screen.getByText(tekst, { exact: false })).toBeDefined();
      expect(screen.getByText("Ta kontakt med nærmeste leder for veiledning.")).toBeDefined();
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.queryByText("Kari Nordmann")).toBeNull();
      expect(screen.queryByText("Test Saksbehandler")).toBeNull();
      expect(screen.queryByText(/Sak 201/)).toBeNull();
    },
    15000,
  );

  it("viser misbruktype når kategori byttes til en kategori med misbrukstyper", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Endre saksinformasjon" }));
    fireEvent.change(await screen.findByLabelText("Kategori (må fylles ut)"), {
      target: { value: "ARBEID" },
    });

    expect(await screen.findByLabelText("Misbrukstype")).toBeDefined();
  }, 15000);

  it("viser saksbehandler med delte brukere, men skjuler handlinger og fjern-knapper for ikke-eier", async () => {
    renderDetaljside(deltMedSakId);

    expect((await screen.findAllByText("Saksbehandler")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Opprett oppgave i Gosys" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Arkiver dokument(er) i Gosys" })).toBeNull();
    expect(screen.getByText("Delt tilgang")).toBeDefined();
    expect(screen.getByText("Ingen ansvarlig saksbehandler satt.")).toBeDefined();
    expect(screen.getAllByText("Kari Nordmann").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ada Larsen").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fjern deling med Kari Nordmann" })).toBeNull();
  }, 15000);

  it("viser tilgangsmelding for historikk (og skjuler Tildel meg) når tilgangsmaskinen ikke gir tilgang til personen", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const sak = hentAlleSaker(hentMockState(testRequest)).find(
      (s) => s.id === Number(deltMedSakId),
    );
    if (!sak) {
      throw new Error("Fant ikke testdata for sak");
    }

    sak.adresseskjermet = true;
    // Saken må være fordelt. På en ufordelt sak gir ikke delt-med tilgang.
    sak.saksbehandlere.eier = { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" };
    // Gi innlogget bruker (Z999999) direkte tilgang (delt-med) slik at vi isolerer
    // effekten av manglende persontilgang (sak.tilgang.kanSeHistorikk) fra harDirekteTilgang-sjekken.
    sak.saksbehandlere.deltMed = [
      { navIdent: "Z999999", navn: "Test Saksbehandler", enhet: "4812" },
    ];
    (
      sak as unknown as {
        tilgang?: {
          harTilgangTilKontrollobjekt: boolean;
          kanSeHistorikk: boolean;
          kanSeRelaterteSaker: boolean;
          kanTildeleSak: boolean;
          kanSeFiler: boolean;
        };
      }
    ).tilgang = {
      harTilgangTilKontrollobjekt: false,
      kanSeHistorikk: false,
      kanSeRelaterteSaker: false,
      kanTildeleSak: false,
      kanSeFiler: false,
    };

    renderDetaljside(deltMedSakId);

    await screen.findByRole("heading", { level: 1, name: /^Sak / });
    expect(
      await screen.findByText(
        "Du har ikke tilgang til personen saken gjelder, og kan derfor ikke se historikk.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        "Du har ikke tilgang til personen saken gjelder, og kan derfor ikke se dokumenter og vedlegg.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Filer" })).toBeNull();
    expect(screen.queryByText("Ingen dokumenter eller filer ennå")).toBeNull();
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
      const filer = await screen.findByRole("checkbox", { name: "Lastet opp alle filer fra S:" });
      expect((filer as HTMLInputElement).disabled).toBe(true);
      expect(
        (
          screen.getByRole("checkbox", {
            name: "Overført all informasjon fra Access",
          }) as HTMLInputElement
        ).disabled,
      ).toBe(true);
      expect(
        (
          screen.getByRole("button", {
            name: "Marker saken som ferdig flyttet",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      expect(screen.getByText(/Ferdigmerking kan ikke lagres/)).toBeDefined();
      expect(screen.getByText("Migreringsnotat (forhåndsvisning)")).toBeDefined();
    },
    15000,
  );

  it("viser sjekklisten for ansvarlig i lokal backend uten migreringsnotat-placeholder", async () => {
    visningsmiljø.verdi = "local-backend";
    const { container } = renderDetaljside("1182");

    const filer = await screen.findByRole("checkbox", { name: "Lastet opp alle filer fra S:" });
    const info = screen.getByRole("checkbox", { name: "Overført all informasjon fra Access" });
    expect((filer as HTMLInputElement).disabled).toBe(false);
    expect((info as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByRole("heading", { name: "Sjekkliste – flytt fra Access" })).toBeDefined();
    expect(container.querySelector('input[name="handling"]')?.getAttribute("value")).toBe(
      "MIGRERING_FERDIGSTILL",
    );
    expect(container.querySelector('input[name="lastetOppFiler"]')).not.toBeNull();
    expect(container.querySelector('input[name="overfortInformasjon"]')).not.toBeNull();
    expect(screen.queryByText("Migreringsnotat (forhåndsvisning)")).toBeNull();
  }, 15000);

  it("aktiverer ferdigknappen først når begge punktene i sjekklisten er krysset av", async () => {
    visningsmiljø.verdi = "local-backend";
    renderDetaljside("1182");

    const knapp = (await screen.findByRole("button", {
      name: "Marker saken som ferdig flyttet",
    })) as HTMLButtonElement;
    const filer = screen.getByRole("checkbox", { name: "Lastet opp alle filer fra S:" });
    const info = screen.getByRole("checkbox", { name: "Overført all informasjon fra Access" });
    expect(knapp.disabled).toBe(true);

    fireEvent.click(filer);
    expect(knapp.disabled).toBe(true);

    fireEvent.click(info);
    expect(knapp.disabled).toBe(false);

    fireEvent.click(filer);
    expect(knapp.disabled).toBe(true);
  }, 15000);

  it("viser ferdig migrert mock-sak med notat under Filer og grønn eksempelbekreftelse", async () => {
    renderDetaljside("1181");

    const notatlenke = await screen.findByRole("link", { name: "Notat fra opprettelse" });
    expect(notatlenke.getAttribute("href")).toBe(
      "/saker/1181/dokumenter/00000000-0000-4000-8000-000000001181",
    );
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

  it("husker at bekreftelsen er lukket etter at siden lastes på nytt", async () => {
    const første = renderDetaljside("1181");
    await screen.findByText("Saken er ferdig flyttet 🎉");
    fireEvent.click(screen.getByRole("button", { name: "Lukk bekreftelsen" }));
    expect(screen.queryByText("Saken er ferdig flyttet 🎉")).toBeNull();
    første.unmount();

    renderDetaljside("1181");
    await screen.findByRole("link", { name: "Notat fra opprettelse" });
    expect(screen.queryByText("Saken er ferdig flyttet 🎉")).toBeNull();
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

    const kontroll = await screen.findByRole("checkbox", { name: "Lastet opp alle filer fra S:" });
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

  it("viser dokumentoversikten i Gosys under Filer, med Gosys-handlingene for eier", async () => {
    renderDetaljside();

    const overskrift = await screen.findByRole("heading", {
      name: `Dokumentoversikt i Gosys for sak ${testSakId}`,
    });
    const filer = screen.getByRole("heading", { name: "Filer" });
    expect(
      filer.compareDocumentPosition(overskrift) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Åpne dokumentoversikt" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett oppgave i Gosys" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Arkiver dokument(er) i Gosys" })).toBeDefined();
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
    // På en ufordelt sak ser alle filområdet, så saken må være fordelt.
    koblingSak.saksbehandlere.eier = {
      navIdent: "Z111111",
      navn: "Annen Saksbehandler",
      enhet: "4812",
    };

    renderDetaljside(koblingSakId);

    expect(
      await screen.findByText(
        "Du må få delt tilgang til saken for å kunne se dokumenter og vedlegg.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Filer" })).toBeNull();
  }, 15000);

  it("viser filområdet for alle på en ufordelt sak", async () => {
    renderDetaljside("102");

    expect(await screen.findByRole("heading", { name: "Filer" })).toBeDefined();
    expect(
      screen.queryByText("Du må få delt tilgang til saken for å kunne se dokumenter og vedlegg."),
    ).toBeNull();
  }, 15000);

  it("skjuler filer og historikk for leder som ikke er saksbehandler på saken", async () => {
    erLeder = true;
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const sak = hentAlleSaker(hentMockState(testRequest)).find((s) => s.id === 102);
    if (!sak) {
      throw new Error("Fant ikke testdata for sak");
    }
    sak.saksbehandlere.eier = { navIdent: "Z111111", navn: "Annen Saksbehandler", enhet: "4812" };

    renderDetaljside("102");

    expect(
      await screen.findByText(
        "Du må få delt tilgang til saken for å kunne se dokumenter og vedlegg.",
      ),
    ).toBeDefined();
    expect(
      screen.getByText("Du må få delt tilgang til saken for å kunne se historikk."),
    ).toBeDefined();
  }, 15000);

  it("viser organisasjonsnummer-felt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Endre saksinformasjon" }));

    expect(await screen.findByLabelText("Organisasjonsnummer")).toBeDefined();
  }, 15000);

  it("normaliserer kommaseparerte organisasjonsnummer i redigeringsvisningen", async () => {
    const { container } = renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Endre saksinformasjon" }));
    fireEvent.change(await screen.findByLabelText("Organisasjonsnummer"), {
      target: { value: "123 456 789, 987654321" },
    });

    const skjulteFelt = container.querySelectorAll<HTMLInputElement>('input[name="arbeidsgivere"]');
    expect(Array.from(skjulteFelt, (input) => input.value)).toEqual(["123456789", "987654321"]);
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
