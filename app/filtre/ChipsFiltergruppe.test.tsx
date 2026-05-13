import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import { ChipsFiltergruppe } from "./ChipsFiltergruppe";

describe("ChipsFiltergruppe", () => {
  const alternativer = [
    { verdi: "ARBEID", etikett: "Arbeid" },
    { verdi: "SAMLIV", etikett: "Samliv" },
    { verdi: "HELSE", etikett: "Helse" },
  ];

  it("viser tittel og alle alternativer", () => {
    render(
      <MemoryRouter>
        <ChipsFiltergruppe
          tittel="Kategori"
          alternativer={alternativer}
          valgteVerdier={[]}
          onToggle={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Kategori")).toBeDefined();
    expect(screen.getByRole("button", { name: "Arbeid" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Samliv" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Helse" })).toBeDefined();
  });

  it("markerer valgte verdier som selected", () => {
    render(
      <MemoryRouter>
        <ChipsFiltergruppe
          tittel="Kategori"
          alternativer={alternativer}
          valgteVerdier={["ARBEID", "HELSE"]}
          onToggle={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Arbeid" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Samliv" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
    expect(screen.getByRole("button", { name: "Helse" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("kaller onToggle med riktig verdi ved klikk", () => {
    const onToggle = vi.fn();

    render(
      <MemoryRouter>
        <ChipsFiltergruppe
          tittel="Kategori"
          alternativer={alternativer}
          valgteVerdier={[]}
          onToggle={onToggle}
        />
      </MemoryRouter>,
    );

    screen.getByRole("button", { name: "Samliv" }).click();

    expect(onToggle).toHaveBeenCalledWith("SAMLIV");
  });

  it("rendrer ikke noe ekstra når alternativer er tom", () => {
    const { container } = render(
      <MemoryRouter>
        <ChipsFiltergruppe
          tittel="Kategori"
          alternativer={[]}
          valgteVerdier={[]}
          onToggle={() => {}}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Kategori")).toBeDefined();
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});
