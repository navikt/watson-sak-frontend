import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import type { AnsattOversikt } from "../beregninger";
import { AnsatteOversikt } from "./AnsatteOversikt";

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

function lagAnsatt(overstyringer: Partial<AnsattOversikt> = {}): AnsattOversikt {
  return {
    navIdent: "Z000000",
    navn: "Test Testesen",
    totalAntall: 0,
    innenforFrist: 0,
    overFrist: 0,
    ...overstyringer,
  };
}

describe("AnsatteOversikt", () => {
  it("viser navn og lenke til alle saker filtrert på enhet og saksbehandler", () => {
    const ansatte = [
      lagAnsatt({ navIdent: "Z1", navn: "Ada Larsen", totalAntall: 5, innenforFrist: 5 }),
    ];

    renderMedRouter(<AnsatteOversikt ansatte={ansatte} enhetId="hu424t" />);

    const lenke = screen.getByRole("link", { name: "Ada Larsen" });
    expect(lenke.getAttribute("href")).toBe("/alle-saker?enhet=hu424t&saksbehandler=Z1");
  });

  it("viser antall saker og skiller innenfor/over frist i den tilgjengelige beskrivelsen", () => {
    const ansatte = [
      lagAnsatt({
        navIdent: "Z1",
        navn: "Ada Larsen",
        totalAntall: 5,
        innenforFrist: 3,
        overFrist: 2,
      }),
    ];

    renderMedRouter(<AnsatteOversikt ansatte={ansatte} enhetId="hu424t" />);

    expect(
      screen.getByRole("img", { name: "3 innenfor frist og 2 over frist, av totalt 5 saker" }),
    ).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  it("viser melding når enheten ikke har noen saksbehandlere", () => {
    renderMedRouter(<AnsatteOversikt ansatte={[]} enhetId="hu424t" />);

    expect(screen.getByText("Fant ingen saksbehandlere i enheten.")).toBeDefined();
  });

  it("viser kun de 8 første ansatte som standard, med mulighet til å vise alle", () => {
    const ansatte = Array.from({ length: 10 }, (_, i) =>
      lagAnsatt({ navIdent: `Z${i}`, navn: `Ansatt ${i}`, totalAntall: 10 - i }),
    );

    renderMedRouter(<AnsatteOversikt ansatte={ansatte} enhetId="hu424t" />);

    expect(screen.getAllByRole("row")).toHaveLength(1 + 8); // header + 8 rader
    expect(screen.getByRole("button", { name: "Vis alle (10)" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Vis alle (10)" }));

    expect(screen.getAllByRole("row")).toHaveLength(1 + 10);
    expect(screen.getByRole("button", { name: "Vis færre" })).toBeDefined();
  });

  it("kan sortere på navn og saker", () => {
    const ansatte = [
      lagAnsatt({ navIdent: "Z1", navn: "Bjørn", totalAntall: 8 }),
      lagAnsatt({ navIdent: "Z2", navn: "Ada", totalAntall: 2 }),
    ];

    renderMedRouter(<AnsatteOversikt ansatte={ansatte} enhetId="hu424t" />);

    // Standard sortering: flest saker øverst
    let rader = screen.getAllByRole("row").slice(1);
    expect(rader[0].textContent).toContain("Bjørn");

    fireEvent.click(screen.getByRole("button", { name: "Sorter på saksbehandler" }));

    rader = screen.getAllByRole("row").slice(1);
    expect(rader[0].textContent).toContain("Ada");

    fireEvent.click(screen.getByRole("button", { name: "Sorter på saker" }));
    rader = screen.getAllByRole("row").slice(1);
    expect(rader[0].textContent).toContain("Bjørn");
  });
});
