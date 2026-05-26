import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TagOverflow } from "./TagOverflow";

describe("TagOverflow", () => {
  it("viser tomInnhold når listen er tom", () => {
    render(<TagOverflow tags={[]} tomInnhold={<span>–</span>} />);

    expect(screen.getByText("–")).toBeDefined();
  });

  it("viser kun én tag når det er bare én verdi", () => {
    render(<TagOverflow tags={["Skjult samliv"]} />);

    expect(screen.getByText("Skjult samliv")).toBeDefined();
    expect(screen.queryByText(/\+/)).toBeNull();
  });

  it("viser første tag og +N badge når det er flere verdier", () => {
    render(<TagOverflow tags={["Skjult samliv", "Fiktiv inntekt", "Dobbeltliv"]} />);

    expect(screen.getByText("Skjult samliv")).toBeDefined();
    expect(screen.getByText("+2")).toBeDefined();
    expect(screen.queryByText("Fiktiv inntekt")).toBeNull();
    expect(screen.queryByText("Dobbeltliv")).toBeNull();
  });

  it("viser +1 badge med riktig tekst for to verdier", () => {
    render(<TagOverflow tags={["A", "B"]} />);

    expect(screen.getByText("A")).toBeDefined();
    expect(screen.getByText("+1")).toBeDefined();
  });
});
