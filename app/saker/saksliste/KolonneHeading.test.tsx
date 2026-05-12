import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KolonneHeading } from "./KolonneHeading";

describe("KolonneHeading", () => {
  it("rendrer en tekst-span når sortering ikke er satt", () => {
    render(<KolonneHeading tittel="Misbrukstype" />);

    expect(screen.getByText("Misbrukstype")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("rendrer en sorteringsknapp når sortering er satt", () => {
    render(
      <KolonneHeading
        tittel="Opprettet"
        sortering={{ aktiv: false, retning: null, onSort: vi.fn() }}
      />,
    );

    expect(screen.getByRole("button", { name: "Sorter på opprettet" })).toBeDefined();
  });

  it("kaller onSort ved klikk", () => {
    const onSort = vi.fn();

    render(
      <KolonneHeading tittel="Opprettet" sortering={{ aktiv: false, retning: null, onSort }} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sorter på opprettet" }));
    expect(onSort).toHaveBeenCalledOnce();
  });

  it("viser retningsikon når kolonnen er aktiv sorteringskolonne", () => {
    const { container } = render(
      <KolonneHeading
        tittel="Opprettet"
        sortering={{ aktiv: true, retning: "stigende", onSort: vi.fn() }}
      />,
    );

    const ikon = container.querySelector("svg");
    expect(ikon).toBeDefined();
    expect(ikon?.classList.contains("text-ax-text-accent")).toBe(true);
  });

  it("viser nøytralt ikon når kolonnen ikke er aktiv", () => {
    const { container } = render(
      <KolonneHeading
        tittel="Opprettet"
        sortering={{ aktiv: false, retning: null, onSort: vi.fn() }}
      />,
    );

    const ikon = container.querySelector("svg");
    expect(ikon).toBeDefined();
    expect(ikon?.classList.contains("text-ax-text-neutral-subtle")).toBe(true);
  });
});
