import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { MigreringInnhold } from "./MigreringInnhold";
import { MOCK_MIGRERING_KANDIDATER } from "./mock-data";

describe("MigreringInnhold", () => {
  const innloggetNavIdent = "Z999999";

  const renderComponent = (props = {}) => {
    const defaultProps = {
      kandidater: MOCK_MIGRERING_KANDIDATER,
      innloggetNavIdent,
      ...props,
    };

    const RouterStub = createRoutesStub([
      {
        path: "/",
        Component: () => <MigreringInnhold {...defaultProps} />,
      },
    ]);

    return render(<RouterStub initialEntries={["/"]} />);
  };

  it("viser overskrift og tabs for mine og ufordelte saker", () => {
    renderComponent();

    expect(screen.getByRole("heading", { name: "Migrering" })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /Mine saker/ })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /Ufordelte saker/ })).not.toBeNull();
  });

  it("viser egne kandidater i Mine saker-fanen", () => {
    renderComponent();

    // Hans Hansen (PID 100245) har ansvarligNavIdent: "Z999999"
    expect(screen.getByText("Hans Hansen")).not.toBeNull();
    expect(screen.getByText("100245")).not.toBeNull();
  });

  it("bytter til ufordelte saker når fanen klikkes", () => {
    renderComponent();

    const ufordelteTab = screen.getByRole("tab", { name: /Ufordelte saker/ });
    fireEvent.click(ufordelteTab);

    // Birger Lorumipsum-Olsen (PID 100412) er ufordelt
    expect(screen.getByText("Birger Lorumipsum-Olsen")).not.toBeNull();
    expect(screen.getByText("100412")).not.toBeNull();
  });

  it("filtrerer listen ved søk", () => {
    renderComponent();

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "Kari" } });

    expect(screen.getByText("Kari Nordmann")).not.toBeNull();
    expect(screen.queryByText("Hans Hansen")).toBeNull();
  });
});
