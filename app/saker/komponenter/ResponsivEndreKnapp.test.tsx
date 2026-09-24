import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResponsivEndreKnapp } from "./ResponsivEndreKnapp";

describe("ResponsivEndreKnapp", () => {
  it("viser Endre-tekst kun fra xl-brekkpunktet og beholder tilgjengelig navn", () => {
    render(<ResponsivEndreKnapp ariaLabel="Endre status" onClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Endre status" })).toBeDefined();
    expect(screen.getByText("Endre").className).toContain("hidden xl:inline");
  });
});
