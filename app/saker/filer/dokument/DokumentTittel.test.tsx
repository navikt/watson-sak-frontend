import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DokumentTittel } from "./DokumentTittel";

describe("DokumentTittel", () => {
  it("autofokuserer og markerer tittelfeltet for et utitelt dokument", () => {
    render(<DokumentTittel tittel="Uten tittel" redigerbar onEndre={() => {}} />);

    const felt = screen.getByLabelText<HTMLInputElement>("Dokumenttittel");
    expect(felt).toBe(document.activeElement);
    expect(felt.selectionStart).toBe(0);
    expect(felt.selectionEnd).toBe("Uten tittel".length);
  });

  it("autofokuserer ikke når dokumentet allerede har en tittel", () => {
    render(<DokumentTittel tittel="Saksframlegg" redigerbar onEndre={() => {}} />);

    const felt = screen.getByLabelText("Dokumenttittel");
    expect(felt).not.toBe(document.activeElement);
  });

  it("rendrer tittelen som overskrift i lesemodus", () => {
    render(<DokumentTittel tittel="Vedtak" redigerbar={false} onEndre={() => {}} />);

    expect(screen.getByRole("heading", { level: 1, name: "Vedtak" })).toBeDefined();
    expect(screen.queryByLabelText("Dokumenttittel")).toBeNull();
  });
});
