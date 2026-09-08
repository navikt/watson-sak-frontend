import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { LederEnhetStatistikk } from "../types";
import { Enhetsstatistikk } from "./Enhetsstatistikk";

const statistikk: LederEnhetStatistikk = {
  totaltAntallIkkeAvsluttede: 15,
  antallOverFrist: 4,
  antallUfordelte: 2,
  perStatus: {
    OPPRETTET: 1,
    UTREDES: 2,
    STRAFFERETTSLIG_VURDERING: 3,
    ANMELDT: 4,
    HENLAGT: 5,
  },
  perArbeidsstatus: {
    IKKE_BLOKKERT: 6,
    VENTER_PA_INFORMASJON: 3,
    VENTER_PA_VEDTAK: 4,
    I_BERO: 2,
  },
};

describe("Enhetsstatistikk", () => {
  it("viser alle status- og arbeidsstatussegmenter", () => {
    const router = createMemoryRouter(
      [{ path: "/", element: <Enhetsstatistikk statistikk={statistikk} enhetId="hu424t" /> }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    expect(screen.getByText("Strafferettslig vurdering")).toBeDefined();
    expect(screen.getByText("Anmeldt")).toBeDefined();
    expect(screen.getByText("Henlagt")).toBeDefined();
    expect(screen.getByText("Ikke blokkert")).toBeDefined();
    expect(screen.getByText("Venter på informasjon")).toBeDefined();
    expect(screen.getByText("Venter på vedtak")).toBeDefined();
    expect(screen.getByText("I bero")).toBeDefined();
  });

  it("lenker status til saksliste filtrert på serverutledet enhet", () => {
    const router = createMemoryRouter(
      [{ path: "/", element: <Enhetsstatistikk statistikk={statistikk} enhetId="hu424t" /> }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    expect(screen.getByRole("link", { name: "Anmeldt" }).getAttribute("href")).toBe(
      "/alle-saker?enhet=hu424t&status=ANMELDT",
    );
  });
});
