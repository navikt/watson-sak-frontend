import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { Filtre } from "./Filtre";

const ALTERNATIVER = {
  saksbehandler: [],
  enhet: [],
  aKrimsenter: [],
  merking: [],
  kategori: [
    { label: "Arbeid", value: "ARBEID" },
    { label: "Samliv", value: "SAMLIV" },
  ],
  misbrukstype: [
    { label: "Fiktivt arbeidsforhold", value: "FIKTIVT_ARBEIDSFORHOLD", kategori: "ARBEID" },
    { label: "Svart arbeid", value: "SVART_ARBEID", kategori: "ARBEID" },
    { label: "Skjult samliv", value: "SKJULT_SAMLIV", kategori: "SAMLIV" },
  ],
};

describe("Filtre – koblet kategori/misbrukstype", () => {
  it("viser alle misbrukstyper når ingen kategori er valgt", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Filtre alternativer={ALTERNATIVER} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Fiktivt arbeidsforhold" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Svart arbeid" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Skjult samliv" })).toBeDefined();
  });

  it("viser kun misbrukstyper for valgt kategori", () => {
    render(
      <MemoryRouter initialEntries={["/?kategori=ARBEID"]}>
        <Filtre alternativer={ALTERNATIVER} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Fiktivt arbeidsforhold" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Svart arbeid" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Skjult samliv" })).toBeNull();
  });

  it("viser misbrukstyper for alle valgte kategorier", () => {
    render(
      <MemoryRouter initialEntries={["/?kategori=ARBEID&kategori=SAMLIV"]}>
        <Filtre alternativer={ALTERNATIVER} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Fiktivt arbeidsforhold" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Skjult samliv" })).toBeDefined();
  });

  it("viser alle misbrukstyper etter at kategori-filter fjernes (ny render uten kategori)", () => {
    // Uten kategori-filter vises alle misbrukstyper
    const { unmount } = render(
      <MemoryRouter initialEntries={["/?kategori=ARBEID"]}>
        <Filtre alternativer={ALTERNATIVER} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Skjult samliv" })).toBeNull();
    unmount();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Filtre alternativer={ALTERNATIVER} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Skjult samliv" })).toBeDefined();
  });
});
