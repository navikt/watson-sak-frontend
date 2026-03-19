import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Preferences } from "~/preferanser/PreferencesCookie";
import { InnstillingerModal } from "./InnstillingerModal";

const preferences: Preferences = {
  sidebarKollapset: false,
  tema: "system",
  visVelkomstmelding: true,
};

describe("InnstillingerModal", () => {
  it("viser theme-valg og oppdaterer preferanser umiddelbart", async () => {
    const onClose = vi.fn();
    const onPreferenceChange = vi.fn();

    render(
      <InnstillingerModal
        erApen={true}
        onClose={onClose}
        preferences={preferences}
        onPreferenceChange={onPreferenceChange}
      />,
    );

    expect(screen.getByRole("heading", { name: "Innstillinger" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Følg systemet" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Lyst tema" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Mørkt tema" })).toBeDefined();
    expect(screen.getByRole("checkbox", { name: "Vis velkomstmelding" })).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByRole("radio", { name: "Mørkt tema" }));
    });
    expect(onPreferenceChange).toHaveBeenCalledWith("tema", "dark");

    await act(async () => {
      fireEvent.click(screen.getByRole("checkbox", { name: "Vis velkomstmelding" }));
    });
    expect(onPreferenceChange).toHaveBeenCalledWith("visVelkomstmelding", false);

    const lukkKnapper = screen.getAllByRole("button", { name: "Lukk" });
    const lukkKnapp = lukkKnapper.at(-1);

    if (!lukkKnapp) {
      throw new Error("Fant ikke lukk-knappen i modal-footer");
    }

    await act(async () => {
      fireEvent.click(lukkKnapp);
    });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
