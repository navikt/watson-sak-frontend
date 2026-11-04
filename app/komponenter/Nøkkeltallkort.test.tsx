import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Nøkkeltallkort } from "./Nøkkeltallkort";

describe("Nøkkeltallkort", () => {
  it("formaterer numeriske verdier med norsk tusenskille og lar strenger være uendret", () => {
    const { rerender } = render(
      <Nøkkeltallkort verdi={3117} etikett="Saker" forklaring="Totalt" farge="info" />,
    );

    expect(screen.getByText((_, element) => element?.textContent === "3\u00a0117")).toBeDefined();

    rerender(
      <Nøkkeltallkort verdi="3 117 saker" etikett="Saker" forklaring="Totalt" farge="info" />,
    );

    expect(screen.getByText("3 117 saker")).toBeDefined();
  });
});
