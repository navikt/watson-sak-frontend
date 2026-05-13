import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Filterpanel } from "./Filterpanel";

describe("Filterpanel", () => {
  it("rendrer children", () => {
    render(
      <Filterpanel>
        <div data-testid="child-1">Filter 1</div>
        <div data-testid="child-2">Filter 2</div>
      </Filterpanel>,
    );

    expect(screen.getByTestId("child-1")).toBeDefined();
    expect(screen.getByTestId("child-2")).toBeDefined();
  });

  it("bruker riktig responsiv layout", () => {
    const { container } = render(
      <Filterpanel>
        <div>Filter</div>
      </Filterpanel>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).toContain("flex-wrap");
    expect(wrapper.className).toContain("xl:flex-col");
  });
});
