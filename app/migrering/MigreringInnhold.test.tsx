import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRoutesStub, useSearchParams } from "react-router";
import { MigreringInnhold } from "./MigreringInnhold";
import { hentMockMigreringKandidater } from "./mock-data.server";
import type { MigreringKandidat, MigreringLister, MigreringSide } from "./types";

const kandidater = hentMockMigreringKandidater("L999999");
function lagSide(
  kandidater: MigreringKandidat[],
  side = 1,
  totalSider = kandidater.length > 0 ? 1 : 0,
  totalAntall = kandidater.length,
): MigreringSide {
  return { kandidater, side, totalSider, totalAntall };
}

const lister: MigreringLister = {
  mine: lagSide(kandidater.filter((k) => k.ansvar.type === "BEKREFTET")),
  ansatte: lagSide([]),
  utilgjengelig: false,
};
const tilBehandling = kandidater.filter((k) => !k.alleredeMigrertTilKontrollsakId);
const overført = kandidater.filter((k) => k.alleredeMigrertTilKontrollsakId);

function renderSide() {
  const Stub = createRoutesStub([
    {
      path: "/migrering",
      Component: () => <MigreringInnhold lister={lister} />,
    },
    {
      path: "/api/registrer-sak/forhåndsutfyll",
      action: () => null,
    },
    {
      path: "/saker/:sakId",
      Component: () => <div>Saksdetaljer</div>,
    },
  ]);
  return render(<Stub initialEntries={["/migrering"]} />);
}

describe("MigreringInnhold", () => {
  it("viser tabell iht Figma-skisse: PID, Personnummer, Opprettet i Access", () => {
    renderSide();
    expect(screen.getByRole("heading", { name: "Migrering" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "PID" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Personnummer" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Opprettet i Access" })).not.toBeNull();
    expect(screen.getByRole("columnheader", { name: "Status og handling" })).not.toBeNull();
  });

  it("viser ferdigstatus i samme kolonne som handlingen i skissen", () => {
    renderSide();
    expect(overført.length).toBeGreaterThan(0);
    const lenke = screen.getByRole("link", { name: /Flyttet til Watson Sak/ });
    const rad = lenke.closest("tr");
    expect(rad).not.toBeNull();
    if (!rad) throw new Error("Fant ikke raden for ferdig migrert sak");
    expect(within(rad).getByText("100245")).not.toBeNull();
    expect(rad.classList.contains("bg-ax-bg-success-soft")).toBe(true);
    expect(within(rad).queryByRole("button", { name: "Opprett sak" })).toBeNull();
  });

  it("lenker de to syntetiske statusene til saker som finnes i mockdata", () => {
    renderSide();
    expect(screen.getByRole("link", { name: /Flyttet til Watson Sak/ }).getAttribute("href")).toBe(
      "/saker/1181",
    );
    expect(screen.getByRole("link", { name: "Under flytting" }).getAttribute("href")).toBe(
      "/saker/1182",
    );
  });

  it("holder utredning og SV adskilt selv når PID er lik", () => {
    renderSide();
    const rader = screen.getAllByText("100245").map((celle) => celle.closest("tr"));
    expect(rader).toHaveLength(2);
    if (!rader[0] || !rader[1]) throw new Error("Fant ikke begge migreringsradene");
    expect(within(rader[0]).getByRole("link", { name: /Flyttet til Watson Sak/ })).not.toBeNull();
    expect(within(rader[1]).getByRole("button", { name: "Opprett sak" })).not.toBeNull();
  });

  it("viser under flytting når sak finnes, men ikke er bekreftet ferdig", () => {
    const kandidat = { ...overført[0], migreringsstatus: "UNDER_MIGRERING" as const };
    const Stub = createRoutesStub([
      {
        path: "/migrering",
        Component: () => (
          <MigreringInnhold
            lister={{ mine: lagSide([kandidat]), ansatte: lagSide([]), utilgjengelig: false }}
          />
        ),
      },
    ]);
    render(<Stub initialEntries={["/migrering"]} />);
    expect(screen.getByRole("link", { name: "Under flytting" })).not.toBeNull();
    expect(screen.queryByText(/Flyttet til Watson Sak/)).toBeNull();
  });

  it("skjuler statusendring inntil autorisasjon og faglige overganger er implementert", () => {
    // TODO SAK-67, rød sone: test autorisert manuell overgang når backend er klar.
    renderSide();
    expect(screen.queryByRole("button", { name: "Merk migrering fullstendig" })).toBeNull();
  });

  it("viser personnummer for alle kandidater til behandling", () => {
    renderSide();
    expect(lister.ansatte.kandidater).toHaveLength(0);

    const arnePidCelle = screen.getByText("800202");
    const arneRad = arnePidCelle.closest("tr");
    expect(arneRad).not.toBeNull();
    expect(within(arneRad!).getByText("11223344556")).not.toBeNull();
  });

  it("sender fnr for alle kandidater til behandling når Opprett sak trykkes", () => {
    const { container } = renderSide();
    const knapper = screen.getAllByRole("button", { name: "Opprett sak" });
    expect(knapper.length).toBe(tilBehandling.length);
    expect(container.querySelectorAll("form").length).toBe(knapper.length);

    for (const knapp of knapper) {
      expect((knapp as HTMLButtonElement).disabled).toBe(false);
      expect(knapp.getAttribute("data-variant")).toBe("secondary");
      const form = knapp.closest("form");
      expect(form?.querySelector('input[name="legacyPid"]')).not.toBeNull();
      expect(form?.querySelector('input[name="legacyKilde"]')).not.toBeNull();
      expect(form?.querySelector('input[name="fnr"]')).not.toBeNull();
    }
  });

  it("viser feilmelding og tom liste når backend var utilgjengelig", () => {
    const Stub = createRoutesStub([
      {
        path: "/migrering",
        Component: () => (
          <MigreringInnhold
            lister={{ mine: lagSide([]), ansatte: lagSide([]), utilgjengelig: true }}
          />
        ),
      },
    ]);
    render(<Stub initialEntries={["/migrering"]} />);
    expect(screen.getByText(/Vi fikk ikke hentet hele migreringslisten/)).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Opprett sak" })).toBeNull();
  });

  it("viser leders ansattliste uten personnummer og uten Opprett sak", () => {
    const ansatt = {
      ...overført[0],
      ansvar: { type: "BEKREFTET" as const, navIdent: "Z999001" },
      personIdent: null,
      migreringsstatus: "UNDER_MIGRERING" as const,
    };
    const Stub = createRoutesStub([
      {
        path: "/migrering",
        Component: () => (
          <MigreringInnhold
            lister={{ mine: lagSide([]), ansatte: lagSide([ansatt]), utilgjengelig: false }}
          />
        ),
      },
    ]);
    render(<Stub initialEntries={["/migrering"]} />);
    const rad = screen.getByText("Z999001").closest("tr");
    if (!rad) throw new Error("Fant ikke raden til ansatt");
    expect(within(rad).getByText("Under flytting")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Opprett sak" })).toBeNull();
  });

  describe("paginering", () => {
    function SokParametere() {
      const [params] = useSearchParams();
      return <output data-testid="sok">{params.toString()}</output>;
    }

    function renderMedSider(lister: MigreringLister, url = "/migrering") {
      const Stub = createRoutesStub([
        {
          path: "/migrering",
          Component: () => (
            <>
              <MigreringInnhold lister={lister} />
              <SokParametere />
            </>
          ),
        },
        { path: "/api/registrer-sak/forhåndsutfyll", action: () => null },
      ]);
      return render(<Stub initialEntries={[url]} />);
    }

    const femti = Array.from({ length: 20 }, (_, i) => ({
      ...tilBehandling[0],
      kandidatId: `UTREDNING:${300000 + i}`,
      legacyPid: String(300000 + i),
      pid: String(300000 + i),
    }));

    it("viser antall og sidevelger når det er flere sider", () => {
      renderMedSider({
        mine: lagSide(femti, 2, 3, 50),
        ansatte: lagSide([]),
        utilgjengelig: false,
      });

      expect(screen.getByText("Viser 21–40 av 50")).not.toBeNull();
      expect(screen.getByRole("button", { name: /^3$/ })).not.toBeNull();
    });

    it("bytter side ved å sette side i URL-en, og fjerner den på side 1", () => {
      renderMedSider(
        { mine: lagSide(femti, 2, 3, 50), ansatte: lagSide([]), utilgjengelig: false },
        "/migrering?side=2",
      );

      fireEvent.click(screen.getByRole("button", { name: /^3$/ }));
      expect(screen.getByTestId("sok").textContent).toBe("side=3");

      fireEvent.click(screen.getByRole("button", { name: /^1$/ }));
      expect(screen.getByTestId("sok").textContent).toBe("");
    });

    it("beholder ansattesiden når hovedlisten bytter side", () => {
      renderMedSider(
        { mine: lagSide(femti, 1, 3, 50), ansatte: lagSide([]), utilgjengelig: false },
        "/migrering?ansatteSide=4",
      );

      fireEvent.click(screen.getByRole("button", { name: /^2$/ }));
      expect(screen.getByTestId("sok").textContent).toBe("ansatteSide=4&side=2");
    });

    it("viser antall, men ingen sidevelger når alt er på én side", () => {
      renderMedSider({
        mine: lagSide(femti, 1, 1, 20),
        ansatte: lagSide([]),
        utilgjengelig: false,
      });

      expect(screen.getByText("Viser 1–20 av 20")).not.toBeNull();
      expect(screen.queryByRole("button", { name: /^2$/ })).toBeNull();
    });

    it("paginerer ansattlisten for leder med egen parameter", () => {
      const ansatte = femti.map((k) => ({
        ...k,
        ansvar: { type: "BEKREFTET" as const, navIdent: "Z999001" },
        personIdent: null,
      }));
      renderMedSider({
        mine: lagSide([]),
        ansatte: lagSide(ansatte, 1, 2, 30),
        utilgjengelig: false,
      });

      expect(screen.getByText("Viser 1–20 av 30")).not.toBeNull();
      fireEvent.click(screen.getByRole("button", { name: /^2$/ }));
      expect(screen.getByTestId("sok").textContent).toBe("ansatteSide=2");
    });

    it("viser ingen sidetekst når listen er tom", () => {
      renderMedSider({ mine: lagSide([]), ansatte: lagSide([]), utilgjengelig: false });

      expect(screen.queryByText(/^Viser /)).toBeNull();
    });
  });
});
