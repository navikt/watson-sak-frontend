import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
  useLocation,
  useSearchParams,
} from "react-router";
import type { ComponentProps } from "react";
import { RouteConfig } from "~/routeConfig";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";
import type { FordelingSak } from "./typer";

vi.mock("~/saker/handlinger/TildelSaksbehandlerModal", () => ({
  TildelSaksbehandlerModal: ({
    sakId,
    åpen,
    onClose,
  }: {
    sakId: string;
    åpen: boolean;
    onClose: () => void;
  }) =>
    åpen ? (
      <div role="dialog" aria-label={`Tildel sak ${sakId}`}>
        <button type="button" onClick={onClose}>
          Lukk
        </button>
      </div>
    ) : null,
}));

const lagSak = (overstyringer: Partial<FordelingSak> = {}): FordelingSak => ({
  id: 301,
  navn: "Kari Nordmann",
  opprettetDato: "2026-01-13",
  oppdatertDato: "2026-01-14",
  kategori: "ARBEID",
  misbrukstyper: ["SKJULT_SAMLIV"],
  ytelser: ["Dagpenger"],
  merking: [],
  status: null,
  statusKode: null,
  steg: "Opprettet",
  stegKode: "OPPRETTET",
  ...overstyringer,
});

const standardProps: ComponentProps<typeof UfordelteSakerInnhold> = {
  saker: [lagSak()],
  enhet: "Analyse",
  saksbehandlere: ["Kari Nordmann"],
  saksbehandlerDetaljer: mockSaksbehandlerDetaljer,
  submitPath: RouteConfig.FORDELING,
  saksdataUtilgjengelig: false,
  oppsummering: { antallSaker: 20, eldsteLiggetidDager: 8 },
  paginering: { side: 1, totalSider: 1, totalAntall: 20 },
  valgtOmfang: "enhet",
  organisasjonsvalg: [{ verdi: "enhet", label: "Nav Kontroll Øst 01", type: "enhet" }],
  filtervalg: {
    kategorier: [
      { verdi: "ARBEID", etikett: "Arbeid" },
      { verdi: "UTROSKAP", etikett: "Utroskap" },
    ],
    misbrukstyper: [{ verdi: "SKJULT_SAMLIV", etikett: "Skjult samliv" }],
    merkinger: [{ verdi: "PRIORITERT", etikett: "Prioritert" }],
  },
};

function renderInnhold(
  overstyringer: Partial<ComponentProps<typeof UfordelteSakerInnhold>> = {},
  initialEntries = ["/"],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <UfordelteSakerInnhold {...standardProps} {...overstyringer} />
    </MemoryRouter>,
  );
}

describe("UfordelteSakerInnhold", () => {
  it("beholder fokus på filterknappen når et filter velges", () => {
    const router = createMemoryRouter(
      [{ path: "/", element: <UfordelteSakerInnhold {...standardProps} /> }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    const knapp = screen.getByRole("button", { name: "Utroskap" });
    knapp.focus();
    fireEvent.click(knapp);

    expect(new URLSearchParams(router.state.location.search).get("kategori")).toBe("UTROSKAP");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Utroskap" }));
    expect(document.activeElement).toBe(knapp);
  });

  it("sender valgt enhet, filtre og side med som tilbakemål når en sak åpnes", () => {
    let mottattState: unknown = null;
    function SakSide() {
      mottattState = useLocation().state;
      return <p>Saken</p>;
    }
    const søk = "?omfang=enhet&kategori=ARBEID&side=2";
    const router = createMemoryRouter(
      [
        { path: "/", element: <UfordelteSakerInnhold {...standardProps} /> },
        { path: "/saker/:sakId", element: <SakSide /> },
      ],
      { initialEntries: [`/${søk}`] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("link", { name: "#301" }));

    expect(mottattState).toEqual({
      tilbake: { to: `${RouteConfig.FORDELING}${søk}`, label: "Ufordelte saker" },
    });
  });

  it("åpner ikke tildelingsmodalen igjen når brukeren går tilbake til samme kontekst", async () => {
    const router = createMemoryRouter(
      [{ path: "/", element: <UfordelteSakerInnhold {...standardProps} /> }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("button", { name: "Tildel" }));
    expect(screen.getByRole("dialog", { name: "Tildel sak 301" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Utroskap" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await act(() => router.navigate(-1));
    expect(router.state.location.search).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("viser enheten i overskriften og fanetittelen", () => {
    renderInnhold();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Ufordelte saker i Analyse");
    expect(document.title).toBe("Ufordelte saker i Analyse – Watson Sak");
  });

  it("viser valgte filteretiketter i overskriften uten å filtrere serverens saksliste lokalt", () => {
    renderInnhold(
      {
        saker: [
          lagSak(),
          lagSak({
            id: 302,
            kategori: "UTROSKAP",
            misbrukstyper: ["SKJULT_SAMLIV"],
            merking: ["PRIORITERT"],
          }),
        ],
      },
      ["/?kategori=UTROSKAP&misbrukstype=SKJULT_SAMLIV&merking=PRIORITERT"],
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Ufordelte saker i Analyse – Utroskap, Skjult samliv, Prioritert",
    );
    expect(screen.getByRole("link", { name: "#301" })).toBeDefined();
    expect(screen.getByRole("link", { name: "#302" })).toBeDefined();
  });

  it("viser steg-etiketter for gyldige verdier og ignorerer ukjente steg", () => {
    renderInnhold({}, ["/?steg=STRAFFERETTSLIG_VURDERING"]);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Strafferettslig vurdering",
    );
    expect(screen.getByRole("button", { name: "Strafferettslig vurdering" })).toBeDefined();
  });

  it("viser hele organisasjonen når enhet er null", () => {
    renderInnhold({ enhet: null });

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Ufordelte saker i hele organisasjonen",
    );
  });

  it("viser felles sakslistekolonner uten navn og beholder tildel-handling", () => {
    renderInnhold();

    expect(screen.getByRole("columnheader", { name: "Saksid" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "Navn" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Misbrukstype" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: /Status/ })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: /Steg/ })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: /Opprettet/ })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Oppdatert" })).toBeDefined();
    expect(screen.getByRole("link", { name: "#301" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Tildel" })).toBeDefined();
  });

  it("viser Opprettet som standard sortering synkende", () => {
    renderInnhold();

    expect(screen.getByRole("columnheader", { name: /Opprettet/ }).getAttribute("aria-sort")).toBe(
      "descending",
    );
  });

  it("bruker serverens oppsummering og treffantall, ikke antall saker på siden", () => {
    renderInnhold({
      saker: Array.from({ length: 20 }, (_, indeks) => lagSak({ id: 1 + indeks })),
      oppsummering: { antallSaker: 105, eldsteLiggetidDager: 41 },
      paginering: { side: 1, totalSider: 6, totalAntall: 105 },
    });

    expect(screen.getByText("105 saker")).toBeDefined();
    expect(screen.getByText("41", { exact: false })).toBeDefined();
    expect(screen.getByRole("button", { name: "1" })).toBeDefined();
    expect(screen.getAllByRole("link", { name: /^#\d+$/ })).toHaveLength(20);
  });

  it("viser serverens oppsummering også når den ikke samsvarer med sidens saker", () => {
    renderInnhold({
      oppsummering: { antallSaker: 88, eldsteLiggetidDager: 72 },
      saker: [lagSak()],
    });

    expect(screen.getByText("88", { exact: false })).toBeDefined();
    expect(screen.getByText("72", { exact: false })).toBeDefined();
  });

  it("skjuler nøkkeltall når saksdata ikke er tilgjengelig", () => {
    renderInnhold({ saksdataUtilgjengelig: true });

    expect(screen.queryByText("20", { exact: true })).toBeNull();
    expect(screen.getByText(/ikke tilgjengelig/i)).toBeDefined();
  });

  describe("serverpaginering", () => {
    const sideSaker = Array.from({ length: 20 }, (_, indeks) => lagSak({ id: 1 + indeks }));

    function renderMedSider(søkestreng = "", filtervalg = standardProps.filtervalg) {
      const router = createMemoryRouter(
        [
          {
            path: "/",
            element: (
              <UfordelteSakerInnhold
                {...standardProps}
                saker={sideSaker}
                filtervalg={filtervalg}
                paginering={{ side: 1, totalSider: 2, totalAntall: 105 }}
              />
            ),
          },
        ],
        { initialEntries: [`/${søkestreng}`] },
      );
      render(<RouterProvider router={router} />);
      return router;
    }

    it("viser alle saker backend har paginert til siden", () => {
      renderMedSider();

      expect(screen.getAllByRole("link", { name: /^#\d+$/ })).toHaveLength(20);
      expect(screen.getByRole("link", { name: "#1" })).toBeDefined();
      expect(screen.getByRole("link", { name: "#20" })).toBeDefined();
    });

    it("bytter side og beholder andre URL-filtre", () => {
      const router = renderMedSider("?kategori=ARBEID&sorter=kategori&retning=stigende");

      fireEvent.click(screen.getByRole("button", { name: "2" }));

      const params = new URLSearchParams(router.state.location.search);
      expect(params.get("side")).toBe("2");
      expect(params.get("kategori")).toBe("ARBEID");
      expect(params.get("sorter")).toBe("kategori");
      expect(params.get("retning")).toBe("stigende");
    });

    it("viser filtervalg som ikke finnes på den aktuelle siden", () => {
      renderMedSider("?side=2", {
        kategorier: [{ verdi: "UTROSKAP", etikett: "Utroskap" }],
        misbrukstyper: [],
        merkinger: [],
      });

      expect(screen.getByRole("button", { name: "Utroskap" })).toBeDefined();
    });

    it("viser stegfilter for historiske åpne saker og lar filterchip slås av ved tomt resultat", () => {
      renderInnhold(
        {
          saker: [],
          organisasjonsvalg: [
            { verdi: "hele", label: "Hele organisasjonen", type: "organisasjon" },
            { verdi: "enhet", label: "Nav Kontroll Øst 01", type: "enhet" },
          ],
          oppsummering: { antallSaker: 0, eldsteLiggetidDager: 0 },
          valgtOmfang: "enhet",
          paginering: { side: 1, totalSider: 0, totalAntall: 0 },
        },
        ["/?omfang=enhet&steg=UTREDNING"],
      );

      expect(screen.getByRole("combobox", { name: "Vis" })).toBeDefined();
      expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Utredning");
      expect(screen.getByRole("button", { name: "Utredning" })).toBeDefined();
      expect(screen.getByText("Endre filtrering for å finne saker.")).toBeDefined();
      expect(screen.getAllByText("0", { exact: true })).toHaveLength(2);
      expect(screen.getByText("0 saker")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Utredning" }));

      expect(screen.getByText("Ingen ufordelte saker")).toBeDefined();
      expect(
        screen.getByText("Det er for øyeblikket ingen saker som venter på fordeling."),
      ).toBeDefined();
    });

    it("sorterer Opprettet stigende ved første klikk og lagrer sorteringen i URL-en", () => {
      const router = renderMedSider();

      fireEvent.click(screen.getByRole("button", { name: "Sorter på opprettet" }));

      const params = new URLSearchParams(router.state.location.search);
      expect(params.get("sorter")).toBe("opprettet");
      expect(params.get("retning")).toBe("stigende");
    });

    it("sletter side ved sortering", () => {
      const router = renderMedSider("?side=2&kategori=ARBEID");

      fireEvent.click(screen.getByRole("button", { name: "Sorter på kategori" }));

      const params = new URLSearchParams(router.state.location.search);
      expect(params.has("side")).toBe(false);
      expect(params.get("kategori")).toBe("ARBEID");
      expect(params.get("sorter")).toBe("kategori");
    });

    it("nullstiller tildelingsmodal ved filter, sortering, sidebytte og tilbake", async () => {
      const router = renderMedSider();

      fireEvent.click(screen.getAllByRole("button", { name: "Tildel" })[0]);
      expect(screen.getByRole("dialog", { name: "Tildel sak 1" })).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: "Utroskap" }));
      expect(screen.queryByRole("dialog")).toBeNull();

      fireEvent.click(screen.getAllByRole("button", { name: "Tildel" })[0]);
      fireEvent.click(screen.getByRole("button", { name: "Sorter på kategori" }));
      expect(screen.queryByRole("dialog")).toBeNull();

      fireEvent.click(screen.getAllByRole("button", { name: "Tildel" })[0]);
      fireEvent.click(screen.getByRole("button", { name: "2" }));
      expect(screen.queryByRole("dialog")).toBeNull();

      await router.navigate(-1);
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("bytter omfang, nullstiller side og oppdaterer overskrift og fanetittel", () => {
    function InnholdMedValgtOmfang() {
      const [searchParams] = useSearchParams();
      const omfang = searchParams.get("omfang") ?? "enhet";
      return (
        <UfordelteSakerInnhold
          {...standardProps}
          enhet={omfang === "hele" ? null : "Nav Kontroll Øst 01"}
          valgtOmfang={omfang}
          organisasjonsvalg={[
            { verdi: "hele", label: "Hele organisasjonen", type: "organisasjon" },
            { verdi: "enhet", label: "Nav Kontroll Øst 01", type: "enhet" },
          ]}
        />
      );
    }

    const router = createMemoryRouter([{ path: "/", element: <InnholdMedValgtOmfang /> }], {
      initialEntries: ["/?omfang=enhet&side=3&kategori=ARBEID&sorter=kategori"],
    });
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("button", { name: "Tildel" }));
    expect(screen.getByRole("dialog", { name: "Tildel sak 301" })).toBeDefined();
    fireEvent.change(screen.getByRole("combobox", { name: "Vis" }), {
      target: { value: "hele" },
    });

    expect(screen.queryByRole("dialog")).toBeNull();
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get("omfang")).toBe("hele");
    expect(params.has("side")).toBe(false);
    expect(params.get("kategori")).toBe("ARBEID");
    expect(params.get("sorter")).toBe("kategori");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Ufordelte saker i hele organisasjonen – Arbeid",
    );
    expect(document.title).toBe("Ufordelte saker i hele organisasjonen – Arbeid – Watson Sak");
  });
});
