import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createRoutesStub, useSearchParams } from "react-router";
import { MigreringInnhold } from "./MigreringInnhold";
import type {
  MigreringAnsatt,
  MigreringKandidat,
  MigreringLister,
  MigreringSide,
  Migreringsstatus,
} from "./types";

const basis: MigreringKandidat = {
  kandidatId: "UTREDNING:100245",
  kilde: "UTREDNING",
  legacyKilde: "UTREDNING",
  pid: "100245",
  legacyPid: "100245",
  kategori: "TIPS_RESTANSE",
  navn: "Eksempel",
  ansvar: { type: "BEKREFTET", navIdent: "L999999" },
  enhet: "4812",
  vurdering: "MULIG_KANDIDAT",
  ekskluderFraStatistikk: false,
  referansedato: "2023-01-01",
  referansedatoFelt: "TIPSINNDATO",
  fase: "Utredning",
  begrunnelse: "Eksempel",
  kildefelter: [],
  personIdent: "11223344556",
  migreringsstatus: "IKKE_PABEGYNT",
};

function kandidat(
  pid: string,
  status: Migreringsstatus,
  sakId: number | null = null,
  ekstra: Partial<MigreringKandidat> = {},
): MigreringKandidat {
  return {
    ...basis,
    kandidatId: `UTREDNING:${pid}`,
    pid,
    legacyPid: pid,
    migreringsstatus: status,
    alleredeMigrertTilKontrollsakId: sakId,
    ...ekstra,
  };
}

function lagSide(
  kandidater: MigreringKandidat[],
  side = 1,
  totalSider = kandidater.length > 0 ? 1 : 0,
  totalAntall = kandidater.length,
): MigreringSide {
  return { kandidater, side, totalSider, totalAntall };
}

const ansatteValg: MigreringAnsatt[] = [
  {
    navIdent: "Z999001",
    navn: "Åse Hansen",
    enhetId: "4812",
    enhetNavn: "Avdeling Nord",
  },
  {
    navIdent: "Z999002",
    navn: "Bjørn Berg",
    enhetId: "4813",
    enhetNavn: "Avdeling Sør",
  },
];

function lagLister(delvis: Partial<MigreringLister> = {}): MigreringLister {
  return {
    liste: lagSide([]),
    ansatteValg: [],
    filter: { status: [], enhet: null, ansvarlig: null },
    erLeder: false,
    utilgjengelig: false,
    ...delvis,
  };
}

function nærmeste(element: HTMLElement, selektor: string): HTMLElement {
  const treff = element.closest<HTMLElement>(selektor);
  if (!treff) throw new Error(`Fant ikke ${selektor}`);
  return treff;
}

function SokParametere() {
  const [params] = useSearchParams();
  return <output data-testid="sok">{params.toString()}</output>;
}

function renderSide(
  lister: MigreringLister,
  url = "/migrering",
  tildelingsSvar: unknown = { ok: true },
) {
  const tildel = vi.fn(async () => tildelingsSvar);
  const Stub = createRoutesStub([
    {
      path: "/migrering",
      Component: () => (
        <>
          <MigreringInnhold lister={lister} />
          <SokParametere />
        </>
      ),
      action: tildel,
    },
    { path: "/api/registrer-sak/forhåndsutfyll", action: () => null },
    { path: "/saker/:sakId", Component: () => <div>Saksdetaljer</div> },
  ]);
  return { ...render(<Stub initialEntries={[url]} />), tildel };
}

beforeAll(() => {
  // jsdom mangler støtte for modale dialoger.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

describe("MigreringInnhold", () => {
  it("viser overskrift, infotekst og tabell med PID, Fødsels- eller d-nummer, Opprettet i Access og Status", () => {
    renderSide(lagLister({ liste: lagSide([kandidat("100245", "IKKE_PABEGYNT")]) }));

    expect(screen.getByRole("heading", { level: 1, name: "Flytt fra Access" })).not.toBeNull();
    expect(screen.getByText("Her ser du dine egne saker.", { exact: false })).not.toBeNull();
    for (const navn of ["PID", "Fødsels- eller d-nummer", "Opprettet i Access", "Status"]) {
      expect(screen.getByRole("columnheader", { name: navn })).not.toBeNull();
    }
    expect(screen.getByText("112233 44556")).not.toBeNull();
  });

  it("starter flyttingen med fnr og migreringsnøkkel når saken ikke er påbegynt", () => {
    const { container } = renderSide(
      lagLister({ liste: lagSide([kandidat("100245", "IKKE_PABEGYNT")]) }),
    );

    const knapp = screen.getByRole("button", {
      name: "Flytt sak med PID 100245 fra Access",
    });
    expect((knapp as HTMLButtonElement).disabled).toBe(false);
    const form = knapp.closest("form");
    expect(form?.querySelector('input[name="legacyPid"]')).not.toBeNull();
    expect(form?.querySelector('input[name="legacyKilde"]')).not.toBeNull();
    expect(form?.querySelector('input[name="fnr"]')).not.toBeNull();
    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(within(nærmeste(knapp, "tr")).getByText("Ikke startet")).not.toBeNull();
  });

  it("lenker PID til saken og viser status når flyttingen er påbegynt eller ferdig", () => {
    renderSide(
      lagLister({
        liste: lagSide([
          kandidat("100245", "FULLSTENDIG", 1181),
          kandidat("100246", "UNDER_MIGRERING", 1182),
        ]),
      }),
    );

    const ferdig = screen.getByRole("link", { name: "100245" });
    expect(ferdig.getAttribute("href")).toBe("/saker/1181");
    expect(within(nærmeste(ferdig, "tr")).getByText("Ferdig flyttet")).not.toBeNull();

    const påbegynt = screen.getByRole("link", { name: "100246" });
    expect(påbegynt.getAttribute("href")).toBe("/saker/1182");
    expect(within(nærmeste(påbegynt, "tr")).getByText("Under flytting")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Flytt sak med PID/ })).toBeNull();
  });

  it("åpner saken når man klikker et annet sted i raden", async () => {
    renderSide(lagLister({ liste: lagSide([kandidat("100245", "FULLSTENDIG", 1181)]) }));

    fireEvent.click(screen.getByText("01.01.2023"));

    expect(await screen.findByText("Saksdetaljer")).not.toBeNull();
  });

  it("viser bare PID, ikke flytteknapp, når ansvaret ikke er bekreftet", () => {
    renderSide(
      lagLister({
        liste: lagSide([
          kandidat("100245", "IKKE_PABEGYNT", null, {
            ansvar: { type: "UKJENT" },
          }),
        ]),
      }),
    );

    expect(
      screen.queryByRole("button", {
        name: "Flytt sak med PID 100245 fra Access",
      }),
    ).toBeNull();
    expect(screen.getByText("100245")).not.toBeNull();
    expect(screen.getByText("–", { selector: "td" })).not.toBeNull();
  });

  it("skjuler statusendring inntil autorisasjon og faglige overganger er implementert", () => {
    // TODO SAK-67, rød sone: test autorisert manuell overgang når backend er klar.
    renderSide(
      lagLister({
        liste: lagSide([kandidat("100245", "UNDER_MIGRERING", 1182)]),
      }),
    );
    expect(screen.queryByRole("button", { name: "Merk migrering fullstendig" })).toBeNull();
  });

  it("viser feilmelding når backend var utilgjengelig", () => {
    renderSide(lagLister({ utilgjengelig: true }));

    expect(screen.getByText(/Vi fikk ikke hentet hele listen/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: /Flytt sak med PID/ })).toBeNull();
  });

  it("viser tom-tekst uten saker", () => {
    renderSide(lagLister());
    expect(screen.getByText("Ingen saker å vise.")).not.toBeNull();
  });

  describe("filter", () => {
    it("viser statusfilter med valgt status, men ikke avdeling og saksbehandler for saksbehandlere", () => {
      renderSide(
        lagLister({
          filter: { status: ["UNDER_MIGRERING"], enhet: null, ansvarlig: null },
        }),
      );

      const gruppe = screen.getByRole("group", { name: "Status" });
      expect(within(gruppe).getByText("Ikke startet")).not.toBeNull();
      expect(within(gruppe).getByText("Under flytting")).not.toBeNull();
      expect(within(gruppe).getByText("Ferdig flyttet")).not.toBeNull();
      expect(screen.queryByLabelText("Avdeling")).toBeNull();
      expect(screen.queryByLabelText("Saksbehandler")).toBeNull();
    });

    it("legger til og fjerner status i URL-en og starter på side 1", () => {
      renderSide(lagLister(), "/migrering?side=2");
      const gruppe = screen.getByRole("group", { name: "Status" });

      fireEvent.click(within(gruppe).getByText("Under flytting"));
      expect(screen.getByTestId("sok").textContent).toBe("status=UNDER_MIGRERING");
    });

    it("fjerner en valgt status når den klikkes igjen", () => {
      renderSide(
        lagLister({
          filter: { status: ["UNDER_MIGRERING"], enhet: null, ansvarlig: null },
        }),
        "/migrering?status=UNDER_MIGRERING",
      );

      fireEvent.click(
        within(screen.getByRole("group", { name: "Status" })).getByText("Under flytting"),
      );
      expect(screen.getByTestId("sok").textContent).toBe("");
    });

    it("gir ledere valg for avdeling og saksbehandler som oppdaterer URL-en", () => {
      renderSide(lagLister({ erLeder: true, ansatteValg }), "/migrering?side=2");

      fireEvent.change(screen.getByLabelText("Avdeling"), {
        target: { value: "4812" },
      });
      expect(screen.getByTestId("sok").textContent).toBe("enhet=4812");

      fireEvent.change(screen.getByLabelText("Saksbehandler"), {
        target: { value: "Z999001" },
      });
      expect(screen.getByTestId("sok").textContent).toBe("enhet=4812&ansvarlig=Z999001");

      fireEvent.change(screen.getByLabelText("Saksbehandler"), {
        target: { value: "" },
      });
      expect(screen.getByTestId("sok").textContent).toBe("enhet=4812");
    });

    it("skiller lederens egne saker fra andres med overskrifter", () => {
      const egen = (pid: string) =>
        kandidat(pid, "IKKE_PABEGYNT", null, {
          ansvar: { type: "BEKREFTET", navIdent: "L1" },
        });
      const andres = (pid: string) =>
        kandidat(pid, "IKKE_PABEGYNT", null, {
          ansvar: { type: "BEKREFTET", navIdent: "Z999001" },
        });
      renderSide(
        lagLister({
          erLeder: true,
          ansatteValg,
          egenNavIdent: "L1",
          liste: lagSide([egen("1"), egen("2"), andres("3"), andres("4")]),
        }),
      );

      expect(screen.getAllByRole("rowheader").map((e) => e.textContent)).toEqual([
        "Dine saker",
        "Andre saker",
      ]);

      // thead er første radgruppe. Hver tbody har bare sin egen overskrift og sine egne kandidater.
      const [, dine, andre] = screen.getAllByRole("rowgroup");
      expect(
        within(dine)
          .getAllByRole("rowheader")
          .map((e) => e.textContent),
      ).toEqual(["Dine saker"]);
      expect(within(dine).queryByText("3")).toBeNull();
      expect(within(dine).getByText("1")).toBeTruthy();
      expect(within(dine).getByText("2")).toBeTruthy();
      expect(
        within(andre)
          .getAllByRole("rowheader")
          .map((e) => e.textContent),
      ).toEqual(["Andre saker"]);
      expect(within(andre).getByText("3")).toBeTruthy();
      expect(within(andre).queryByText("1")).toBeNull();
    });

    it("viser bare «Andre saker» når siden bare har andres saker", () => {
      const andres = (pid: string) =>
        kandidat(pid, "IKKE_PABEGYNT", null, {
          ansvar: { type: "BEKREFTET", navIdent: "Z999001" },
        });
      renderSide(
        lagLister({
          erLeder: true,
          ansatteValg,
          egenNavIdent: "L1",
          liste: lagSide([andres("3"), andres("4")]),
        }),
      );

      expect(screen.getAllByRole("rowheader").map((e) => e.textContent)).toEqual(["Andre saker"]);
    });

    it("viser ingen overskrifter for andre enn ledere", () => {
      renderSide(lagLister({ liste: lagSide([kandidat("1", "IKKE_PABEGYNT")]) }));

      expect(screen.queryAllByRole("rowheader")).toEqual([]);
    });

    it("begrenser saksbehandlerlisten til valgt avdeling", () => {
      renderSide(
        lagLister({
          erLeder: true,
          ansatteValg,
          filter: { status: [], enhet: "4813", ansvarlig: null },
        }),
      );

      const valg = within(screen.getByLabelText("Saksbehandler")).getAllByRole("option");
      expect(valg.map((o) => o.textContent)).toEqual(["Alle", "Bjørn Berg"]);
    });
  });

  describe("leder", () => {
    const ansattSak = kandidat("200001", "IKKE_PABEGYNT", null, {
      ansvar: { type: "BEKREFTET", navIdent: "Z999001" },
      ansvarligNavn: "Åse Hansen",
      personIdent: null,
    });
    const ansattUnderFlytting = kandidat("200002", "UNDER_MIGRERING", 1190, {
      ansvar: { type: "BEKREFTET", navIdent: "Z999001" },
      ansvarligNavn: "Åse Hansen",
      personIdent: null,
    });

    function renderLeder(tildelingsSvar?: unknown) {
      return renderSide(
        lagLister({
          erLeder: true,
          ansatteValg,
          liste: lagSide([ansattSak, ansattUnderFlytting, kandidat("100245", "IKKE_PABEGYNT")]),
        }),
        "/migrering",
        tildelingsSvar,
      );
    }

    const ansatteTabell = () => within(screen.getByRole("table"));

    it("viser én liste med saksbehandler, og ingen flytteknapp på andres saker", () => {
      renderLeder();

      const ansatte = ansatteTabell();
      expect(ansatte.getByRole("columnheader", { name: "Saksbehandler" })).not.toBeNull();
      expect(ansatte.getAllByText("Åse Hansen")).toHaveLength(2);
      expect(
        ansatte.queryByRole("button", {
          name: "Flytt sak med PID 200001 fra Access",
        }),
      ).toBeNull();
      expect(
        ansatte.getByRole("button", {
          name: "Flytt sak med PID 100245 fra Access",
        }),
      ).not.toBeNull();
    });

    it("tilbyr bare Endre tildeling for saker som ikke er påbegynt", () => {
      renderLeder();

      const ansatte = ansatteTabell();
      expect(
        ansatte.getByRole("button", { name: "Endre tildeling for PID 200001" }),
      ).not.toBeNull();
      expect(
        ansatte.queryByRole("button", {
          name: "Endre tildeling for PID 200002",
        }),
      ).toBeNull();
    });

    it("lar lederen velge en annen saksbehandler enn dagens, og sender valget", async () => {
      const { tildel } = renderLeder();

      fireEvent.click(screen.getByRole("button", { name: "Endre tildeling for PID 200001" }));
      const dialog = await screen.findByRole("dialog");
      const valg = within(dialog).getByLabelText("Ny saksbehandler");
      expect(
        within(valg)
          .getAllByRole("option")
          .map((o) => o.textContent),
      ).toEqual(["Velg saksbehandler", "Bjørn Berg"]);

      fireEvent.change(valg, { target: { value: "Z999002" } });
      fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

      await waitFor(() => expect(tildel).toHaveBeenCalledTimes(1));
      const kall = (tildel.mock.calls[0] as unknown as [{ request: Request }])[0];
      const skjema = await kall.request.formData();
      expect(skjema.get("kandidatId")).toBe("UTREDNING:200001");
      expect(skjema.get("navIdent")).toBe("Z999002");
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("viser feilen fra tildelingen og holder dialogen åpen", async () => {
      renderLeder({
        ok: false,
        feil: "Saken er allerede påbegynt og kan ikke flyttes til en annen.",
      });

      fireEvent.click(screen.getByRole("button", { name: "Endre tildeling for PID 200001" }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.change(within(dialog).getByLabelText("Ny saksbehandler"), {
        target: { value: "Z999002" },
      });
      fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));

      expect(await within(dialog).findByText(/allerede påbegynt/)).not.toBeNull();
      expect(screen.getByRole("dialog")).not.toBeNull();
    });

    it("lukker dialogen uten å sende ved Avbryt", async () => {
      const { tildel } = renderLeder();

      fireEvent.click(screen.getByRole("button", { name: "Endre tildeling for PID 200001" }));
      const dialog = await screen.findByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(tildel).not.toHaveBeenCalled();
    });
  });

  describe("paginering", () => {
    const tjue = Array.from({ length: 20 }, (_, i) =>
      kandidat(String(300000 + i), "IKKE_PABEGYNT"),
    );

    it("viser antall og sidevelger når det er flere sider", () => {
      renderSide(lagLister({ liste: lagSide(tjue, 2, 3, 50) }));

      expect(screen.getByText("Viser 21–40 av 50")).not.toBeNull();
      expect(screen.getByRole("button", { name: /^3$/ })).not.toBeNull();
    });

    it("bytter side ved å sette side i URL-en, og fjerner den på side 1", () => {
      renderSide(lagLister({ liste: lagSide(tjue, 2, 3, 50) }), "/migrering?side=2");

      fireEvent.click(screen.getByRole("button", { name: /^3$/ }));
      expect(screen.getByTestId("sok").textContent).toBe("side=3");

      fireEvent.click(screen.getByRole("button", { name: /^1$/ }));
      expect(screen.getByTestId("sok").textContent).toBe("");
    });

    it("beholder filteret når listen bytter side", () => {
      renderSide(
        lagLister({ liste: lagSide(tjue, 1, 3, 50) }),
        "/migrering?status=UNDER_MIGRERING",
      );

      fireEvent.click(screen.getByRole("button", { name: /^2$/ }));
      expect(screen.getByTestId("sok").textContent).toBe("status=UNDER_MIGRERING&side=2");
    });

    it("viser antall, men ingen sidevelger når alt er på én side", () => {
      renderSide(lagLister({ liste: lagSide(tjue, 1, 1, 20) }));

      expect(screen.getByText("Viser 1–20 av 20")).not.toBeNull();
      expect(screen.queryByRole("button", { name: /^2$/ })).toBeNull();
    });

    it("viser ingen sidetekst når listen er tom", () => {
      renderSide(lagLister());

      expect(screen.queryByText(/^Viser /)).toBeNull();
    });
  });
});
