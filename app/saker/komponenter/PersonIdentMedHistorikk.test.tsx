import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonIdentMedHistorikk } from "./PersonIdentMedHistorikk";

describe("PersonIdentMedHistorikk", () => {
  it("viser formatert ident og kopieringsknapp med uformatert verdi", () => {
    render(
      <PersonIdentMedHistorikk
        personIdent="12345678901"
        harHistorikk={false}
        onVisHistorikk={vi.fn()}
      />,
    );

    expect(screen.getByText("123456 78901")).toBeDefined();
    expect(screen.getByRole("button", { name: /kopier/i })).toBeDefined();
  });

  it("åpner historikk når identifikatoren har historikk", () => {
    const onVisHistorikk = vi.fn();
    render(
      <PersonIdentMedHistorikk
        personIdent="12345678901"
        harHistorikk={true}
        onVisHistorikk={onVisHistorikk}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis identifikatorhistorikk" }));

    expect(onVisHistorikk).toHaveBeenCalledOnce();
  });

  it("deaktiverer historikk-knappen når identifikatoren ikke har historikk", () => {
    render(
      <PersonIdentMedHistorikk
        personIdent="12345678901"
        harHistorikk={false}
        onVisHistorikk={vi.fn()}
      />,
    );

    const historikkKnapp = screen.getByRole("button", { name: "Vis identifikatorhistorikk" });
    expect(historikkKnapp).toBeInstanceOf(HTMLButtonElement);
    if (!(historikkKnapp instanceof HTMLButtonElement)) {
      throw new Error("Historikk-knappen er ikke en knapp");
    }

    expect(historikkKnapp.disabled).toBe(true);
  });
});
