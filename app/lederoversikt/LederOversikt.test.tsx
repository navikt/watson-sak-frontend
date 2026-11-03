import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { LederOversikt } from "./LederOversikt";
import type { LederStatistikk } from "./types";

function lagStatistikk(overstyringer: Partial<LederStatistikk> = {}): LederStatistikk {
  return {
    enhetId: "ky153k",
    enhetNavn: "Øst",
    enhet: {
      totaltAntallIkkeAvsluttede: 0,
      antallOverFrist: 0,
      perSteg: {
        OPPRETTET: 0,
        UTREDNING: 0,
        FORVALTNING: 0,
        STRAFFERETTSLIG_VURDERING: 0,
        POLITI: 0,
      },
      perStatus: {
        UTEN_STATUS: 0,
        AKTIV: 0,
        VENTER_PA_INFORMASJON: 0,
        VENTER_PA_VEDTAK: 0,
        VENTER_PA_RESULTAT: 0,
        PAAKLAGET: 0,
        I_BERO: 0,
      },
      antallUfordelte: 0,
      oyeblikksbilde: { totalt: 0, nye: 0, aktive: 0, venterPåAndre: 0, ikkeFordelt: 0 },
    },
    ansatte: {
      tilgjengelig: true,
      liste: [],
      ufordelt: {
        totaltAntallIkkeAvsluttede: 0,
        antallOverFrist: 0,
        antallAktive: 0,
        antallAktiveOverFrist: 0,
      },
    },
    ledetEnheter: [{ id: "ky153k", navn: "Øst" }],
    ...overstyringer,
  };
}

function renderMedRouter(statistikk: LederStatistikk) {
  const router = createMemoryRouter(
    [{ path: "/", element: <LederOversikt statistikk={statistikk} /> }],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe("LederOversikt", () => {
  it("viser ikke enhetsvelger når lederen leder én enhet", () => {
    renderMedRouter(lagStatistikk());

    expect(screen.queryByText("Vis enhet")).toBeNull();
  });

  it("lar leder av flere enheter velge enhet via URL-en", () => {
    const router = renderMedRouter(
      lagStatistikk({
        ledetEnheter: [
          { id: "ky153k", navn: "Øst" },
          { id: "tipsmottak", navn: "Tipsmottak" },
        ],
      }),
    );

    expect(screen.getByRole("radio", { name: "Øst" }).getAttribute("aria-checked")).toBe("true");

    fireEvent.click(screen.getByRole("radio", { name: "Tipsmottak" }));

    expect(router.state.location.search).toBe("?enhet=tipsmottak");
  });
});
