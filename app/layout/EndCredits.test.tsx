import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EndCredits } from "./EndCredits";

describe("EndCredits", () => {
  it("viser rulletekst med teamet", () => {
    render(<EndCredits onLukk={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Rulletekst" })).toBeTruthy();
    expect(screen.getByText("Kristofer Giltvedt Selbekk")).toBeTruthy();
  });

  it("lukkes når brukeren trykker Escape", () => {
    const onLukk = vi.fn();
    render(<EndCredits onLukk={onLukk} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onLukk).toHaveBeenCalledOnce();
  });

  it("lukkes når brukeren klikker", () => {
    const onLukk = vi.fn();
    render(<EndCredits onLukk={onLukk} />);

    fireEvent.click(screen.getByRole("dialog"));

    expect(onLukk).toHaveBeenCalledOnce();
  });
});
