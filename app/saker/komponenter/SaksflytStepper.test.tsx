import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse } from "../types.backend";
import { SaksflytStepper } from "./SaksflytStepper";

function hentSteg() {
  return within(screen.getByRole("list", { name: "Saksflyt" })).getAllByRole("listitem");
}

describe("SaksflytStepper", () => {
  it("viser ingen knapper uten onEndreSteg", () => {
    render(<SaksflytStepper steg="FORVALTNING" />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("gjør bare kommende steg klikkbare når onEndreSteg er satt", () => {
    render(
      <SaksflytStepper
        steg="FORVALTNING"
        tilgjengeligeSteg={["STRAFFERETTSLIG_VURDERING", "POLITI", "AVSLUTTET"]}
        onEndreSteg={() => {}}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(
      screen.getByRole("button", {
        name: "Strafferettslig vurdering, ikke startet, endre steg",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Politiet, ikke startet, endre steg" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Avsluttet, ikke startet, endre steg" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Opprettet/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Utredning/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Forvaltning/ })).toBeNull();
  });

  it("åpner valgt kommende steg med onEndreSteg", () => {
    const onEndreSteg = vi.fn();
    render(
      <SaksflytStepper
        steg="FORVALTNING"
        tilgjengeligeSteg={["STRAFFERETTSLIG_VURDERING"]}
        onEndreSteg={onEndreSteg}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Strafferettslig vurdering, ikke startet, endre steg" }),
    );

    expect(onEndreSteg).toHaveBeenCalledOnce();
  });

  it("gjør bare tilgjengelige kommende steg klikkbare fra opprettet", () => {
    render(
      <SaksflytStepper
        steg="OPPRETTET"
        tilgjengeligeSteg={["UTREDNING", "STRAFFERETTSLIG_VURDERING"]}
        onEndreSteg={() => {}}
      />,
    );

    expect(screen.getAllByRole("button").map((knapp) => knapp.textContent)).toEqual([
      "Utredning, ikke startet, endre steg",
      "Strafferettslig vurdering, ikke startet, endre steg",
    ]);
    expect(screen.queryByRole("button", { name: /Forvaltning/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Politiet/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Avsluttet/ })).toBeNull();
  });

  it("viser ingen knapper når ingen kommende steg er tilgjengelige", () => {
    render(<SaksflytStepper steg="FORVALTNING" tilgjengeligeSteg={[]} onEndreSteg={() => {}} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("viser alle stegene i saksflyten med status for skjermlesere", () => {
    render(
      <SaksflytStepper
        steg="STRAFFERETTSLIG_VURDERING"
        resultat={{
          utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
          forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
        }}
      />,
    );

    expect(hentSteg().map((steg) => steg.textContent)).toEqual([
      "Opprettet, fullført",
      "Utredning, fullført",
      "Forvaltning, fullført",
      "Strafferettslig vurdering, gjeldende steg",
      "Politiet, ikke startet",
      "Avsluttet, ikke startet",
    ]);
  });

  it("viser steg uten resultat som hoppet over når saken går rett fra opprettet", () => {
    render(<SaksflytStepper steg="STRAFFERETTSLIG_VURDERING" resultat={null} />);

    const steg = hentSteg();
    expect(steg.map((element) => element.textContent)).toEqual([
      "Opprettet, fullført",
      "Utredning, hoppet over",
      "Forvaltning, hoppet over",
      "Strafferettslig vurdering, gjeldende steg",
      "Politiet, ikke startet",
      "Avsluttet, ikke startet",
    ]);
    for (const element of steg.slice(1, 3)) {
      expect(element.querySelector('[aria-hidden="true"]')?.className).toContain(
        "bg-ax-bg-success-strong",
      );
    }
  });

  it("markerer gjeldende steg med aria-current", () => {
    render(<SaksflytStepper steg="FORVALTNING" />);

    const steg = hentSteg();
    expect(steg[2].getAttribute("aria-current")).toBe("step");
    expect(steg.filter((s) => s.hasAttribute("aria-current"))).toHaveLength(1);
  });

  it("slår sammen tilsvarende backend-steg", () => {
    render(<SaksflytStepper steg="ANMELDT" />);

    expect(hentSteg()[4].getAttribute("aria-current")).toBe("step");
  });

  it("markerer alle gjennomførte steg som fullført når saken er avsluttet", () => {
    render(
      <SaksflytStepper
        steg="AVSLUTTET"
        resultat={{
          utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
          forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
          strafferettsligVurdering: { type: "ANMELDT" },
          politi: { type: "DOMFELLELSE" },
        }}
      />,
    );

    expect(hentSteg().every((s) => s.dataset.tilstand === "fullført")).toBe(true);
  });

  it("viser avsluttet som aktivt steg når forvaltningen henlegger saken", () => {
    render(
      <SaksflytStepper
        steg="AVSLUTTET"
        resultat={{
          utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "HENLAGT" },
          },
        }}
      />,
    );

    const steg = hentSteg();
    expect(steg.map((element) => element.dataset.tilstand)).toEqual([
      "fullført",
      "fullført",
      "fullført",
      "kommende",
      "kommende",
      "aktiv",
    ]);
    expect(steg[5].getAttribute("aria-current")).toBe("step");
    expect(steg[5].querySelector('[aria-hidden="true"]')?.className).toContain(
      "bg-ax-border-neutral-subtle",
    );
  });

  it.each<{
    fase: string;
    resultat: KontrollsakResponse["resultat"];
    sisteFullførte: number;
  }>([
    {
      fase: "utredning",
      resultat: { utredning: { type: "HENLAGT" } },
      sisteFullførte: 1,
    },
    {
      fase: "forvaltning",
      resultat: {
        utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
        forvaltning: {
          type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          endeligUtfall: { type: "HENLAGT" },
        },
      },
      sisteFullførte: 2,
    },
    {
      fase: "eldre forvaltningsdata",
      resultat: {
        utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
        forvaltning: { type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE" },
        endeligUtfall: { type: "HENLAGT" },
      },
      sisteFullførte: 2,
    },
    {
      fase: "strafferettslig vurdering",
      resultat: {
        utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
        forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
        strafferettsligVurdering: { type: "HENLAGT" },
      },
      sisteFullførte: 3,
    },
    {
      fase: "politiet",
      resultat: {
        utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" },
        forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
        strafferettsligVurdering: { type: "ANMELDT" },
        politi: { type: "HENLAGT" },
      },
      sisteFullførte: 4,
    },
  ])("viser samme avslutningsmønster ved henleggelse fra $fase", ({ resultat, sisteFullførte }) => {
    render(<SaksflytStepper steg="AVSLUTTET" resultat={resultat} />);

    const steg = hentSteg();
    expect(steg.map((element) => element.dataset.tilstand)).toEqual(
      steg.map((_, indeks) =>
        indeks === 5 ? "aktiv" : indeks <= sisteFullførte ? "fullført" : "kommende",
      ),
    );
    expect(steg.filter((element) => element.hasAttribute("aria-current"))).toEqual([steg[5]]);
    for (const element of steg.slice(sisteFullførte + 1, 5)) {
      expect(element.textContent).toContain("ikke startet");
    }
    for (const element of steg.slice(sisteFullførte + 1)) {
      expect(element.querySelector('[aria-hidden="true"]')?.className).toContain(
        "bg-ax-border-neutral-subtle",
      );
    }
  });

  it("beholder politiet som aktivt steg ved en påklaget henleggelse", () => {
    render(<SaksflytStepper steg="POLITI" resultat={{ politi: { type: "HENLAGT" } }} />);

    expect(hentSteg()[4].getAttribute("aria-current")).toBe("step");
    expect(hentSteg()[5].dataset.tilstand).toBe("kommende");
  });

  it("lar ikke en eldre henleggelse overstyre et senere politiresultat", () => {
    render(
      <SaksflytStepper
        steg="AVSLUTTET"
        resultat={{
          utredning: { type: "HENLAGT" },
          forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
          strafferettsligVurdering: { type: "ANMELDT" },
          politi: { type: "DOMFELLELSE" },
        }}
      />,
    );

    expect(hentSteg().every((element) => element.dataset.tilstand === "fullført")).toBe(true);
  });
});
