import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { LederAnsatteStatistikk, LederAnsattStatistikk } from "../types";
import { AnsatteOversikt } from "./AnsatteOversikt";

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter(
    [
      { path: "/", element: ui },
      { path: "/alle-saker", element: <p>Alle saker</p> },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

function lagAnsatt(overstyringer: Partial<LederAnsattStatistikk> = {}): LederAnsattStatistikk {
  return {
    navIdent: "Z000000",
    navn: "Test Testesen",
    totaltAntallIkkeAvsluttede: 0,
    antallOverFrist: 0,
    ...overstyringer,
  };
}

function lagAnsatte(
  liste: LederAnsattStatistikk[],
  overstyringer: Partial<LederAnsatteStatistikk> = {},
): LederAnsatteStatistikk {
  return {
    tilgjengelig: true,
    liste,
    ufordelt: { totaltAntallIkkeAvsluttede: 0, antallOverFrist: 0 },
    ...overstyringer,
  };
}

describe("AnsatteOversikt", () => {
  it("viser navn og navigerer til saker filtrert på enhet og saksbehandler når raden klikkes", () => {
    const ansatte = lagAnsatte([
      lagAnsatt({ navIdent: "Z1", navn: "Ada Larsen", totaltAntallIkkeAvsluttede: 5 }),
    ]);

    renderMedRouter(<AnsatteOversikt ansatte={ansatte} enhetId="hu424t" />);

    expect(screen.getByText("Ada Larsen")).toBeDefined();
    expect(screen.queryByRole("link", { name: /Ada Larsen/ })).toBeNull();
    expect(screen.queryByText("Z1")).toBeNull();

    const rad = screen.getByText("Ada Larsen").closest("tr");
    expect(rad?.getAttribute("tabindex")).toBe("0");

    fireEvent.click(rad!);

    expect(screen.getByText("Alle saker")).toBeDefined();
  });

  it("viser antall saker og skiller innenfor/over frist i den tilgjengelige beskrivelsen", () => {
    const ansatte = lagAnsatte([
      lagAnsatt({
        navIdent: "Z1",
        navn: "Ada Larsen",
        totaltAntallIkkeAvsluttede: 5,
        antallOverFrist: 2,
      }),
    ]);

    renderMedRouter(<AnsatteOversikt ansatte={ansatte} enhetId="hu424t" />);

    expect(
      screen.getByRole("img", { name: "3 innenfor frist og 2 over frist, av totalt 5 saker" }),
    ).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  it("viser melding når enheten ikke har noen saksbehandlere", () => {
    renderMedRouter(<AnsatteOversikt ansatte={lagAnsatte([])} enhetId="hu424t" />);

    expect(screen.getByText("Fant ingen saksbehandlere i enheten.")).toBeDefined();
  });

  it("viser ufordelte saker som egen rad uten personlenke", () => {
    renderMedRouter(
      <AnsatteOversikt
        ansatte={lagAnsatte([], {
          ufordelt: { totaltAntallIkkeAvsluttede: 3, antallOverFrist: 1 },
        })}
        enhetId="hu424t"
      />,
    );

    const rad = screen.getByText("Ufordelt").closest("tr");
    expect(rad?.querySelector("a")).toBeNull();
    expect(
      screen.getByRole("img", { name: "2 innenfor frist og 1 over frist, av totalt 3 saker" }),
    ).toBeDefined();
  });

  it("viser en tydelig melding når ansattlisten er utilgjengelig", () => {
    renderMedRouter(
      <AnsatteOversikt ansatte={lagAnsatte([], { tilgjengelig: false })} enhetId="hu424t" />,
    );

    expect(
      screen.getByText(
        "Ansattlisten er midlertidig utilgjengelig. Sakstallene for enheten vises fortsatt.",
      ),
    ).toBeDefined();
  });

  it("viser kun de 8 første ansatte som standard, med mulighet til å vise alle", () => {
    const ansatte = lagAnsatte(
      Array.from({ length: 10 }, (_, i) =>
        lagAnsatt({
          navIdent: `Z${i}`,
          navn: `Ansatt ${i}`,
          totaltAntallIkkeAvsluttede: 10 - i,
        }),
      ),
    );

    renderMedRouter(<AnsatteOversikt ansatte={ansatte} enhetId="hu424t" />);

    expect(screen.getAllByRole("row")).toHaveLength(1 + 8 + 1); // header + ansatte + ufordelt
    expect(screen.getByRole("button", { name: "Vis alle saksbehandlere (10)" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Vis alle saksbehandlere (10)" }));

    expect(screen.getAllByRole("row")).toHaveLength(1 + 10 + 1);
    expect(screen.getByRole("button", { name: "Vis færre saksbehandlere" })).toBeDefined();
  });

  it("kan sortere på navn og saker", () => {
    const ansatte = lagAnsatte([
      lagAnsatt({ navIdent: "Z1", navn: "Bjørn", totaltAntallIkkeAvsluttede: 8 }),
      lagAnsatt({ navIdent: "Z2", navn: "Ada", totaltAntallIkkeAvsluttede: 2 }),
    ]);

    renderMedRouter(<AnsatteOversikt ansatte={ansatte} enhetId="hu424t" />);

    // Standard sortering: flest saker øverst
    let rader = screen.getAllByRole("row").slice(1);
    expect(rader[0].textContent).toContain("Bjørn");

    fireEvent.click(screen.getByRole("button", { name: "Sorter på saksbehandler" }));

    rader = screen.getAllByRole("row").slice(1);
    expect(rader[0].textContent).toContain("Ada");

    fireEvent.click(screen.getByRole("button", { name: "Sorter på antall aktive saker" }));
    rader = screen.getAllByRole("row").slice(1);
    expect(rader[0].textContent).toContain("Bjørn");
  });
});
