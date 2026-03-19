import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { defaultPreferences } from "~/preferanser/PreferencesCookie";
import { PreferencesProvider } from "~/preferanser/PreferencesContext";
import { AppSidebar } from "./AppSidebar";

describe("AppSidebar", () => {
  it("viser et innstillinger-menypunkt over menyknappen og åpner modalen", async () => {
    render(
      <MemoryRouter>
        <PreferencesProvider defaultPreferences={defaultPreferences}>
          <AppSidebar />
        </PreferencesProvider>
      </MemoryRouter>,
    );

    const innstillingerKnapp = screen.getByRole("button", { name: "Innstillinger" });
    const menyKnapp = screen.getByRole("button", { name: "Skjul meny" });

    expect(innstillingerKnapp).toBeDefined();
    expect(menyKnapp).toBeDefined();

    const innstillingerY = innstillingerKnapp.getBoundingClientRect().y;
    const menyY = menyKnapp.getBoundingClientRect().y;

    expect(innstillingerY).toBeLessThanOrEqual(menyY);

    await act(async () => {
      fireEvent.click(innstillingerKnapp);
    });

    expect(screen.getByRole("heading", { name: "Innstillinger" })).toBeDefined();
  });
});
