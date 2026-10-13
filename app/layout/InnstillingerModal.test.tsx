import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FeatureFlagg } from "~/feature-toggling/featureflagg";
import { defaultPreferences } from "~/preferanser/PreferencesCookie";
import { InnstillingerModal } from "./InnstillingerModal";

const state = vi.hoisted(() => ({
  flaggPå: true,
  sporHendelse: vi.fn(),
  etterspurtFlagg: [] as string[],
}));

vi.mock("~/feature-toggling/useFeatureFlagg", () => ({
  useEnkeltFeatureFlagg: (flagg: string) => {
    state.etterspurtFlagg.push(flagg);
    return state.flaggPå;
  },
}));
vi.mock("~/analytics/analytics", () => ({ sporHendelse: state.sporHendelse }));

beforeEach(() => {
  state.flaggPå = true;
  state.etterspurtFlagg = [];
  state.sporHendelse.mockClear();
});

function visModal() {
  const onClose = vi.fn();
  const onPreferenceChange = vi.fn();
  render(
    <InnstillingerModal
      erApen
      onClose={onClose}
      preferences={{ ...defaultPreferences, onboardingFullført: true }}
      onPreferenceChange={onPreferenceChange}
    />,
  );
  return { onClose, onPreferenceChange };
}

describe("InnstillingerModal – introduksjon", () => {
  it("bruker feature-flagget watson-sak-onboarding", () => {
    visModal();
    expect(state.etterspurtFlagg).toContain(FeatureFlagg.ONBOARDING);
    expect(FeatureFlagg.ONBOARDING).toBe("watson-sak-onboarding");
  });

  it("skjuler knappen når flagget er av", () => {
    state.flaggPå = false;
    visModal();
    expect(screen.queryByRole("button", { name: "Vis introduksjonen på nytt" })).toBeNull();
  });

  it("starter introduksjonen på nytt når flagget er på", async () => {
    const { onClose, onPreferenceChange } = visModal();
    fireEvent.click(screen.getByRole("button", { name: "Vis introduksjonen på nytt" }));
    expect(onPreferenceChange).toHaveBeenCalledWith("onboardingFullført", false);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(state.sporHendelse).toHaveBeenCalledWith("onboarding startet på nytt");
  });

  it("lukker først etter at oppdateringen av preferansen er fullført", async () => {
    const onClose = vi.fn();
    let løsOppdatering: (() => void) | undefined;
    const onPreferenceChange = vi.fn(
      () => new Promise<void>((resolve) => (løsOppdatering = resolve)),
    );
    render(
      <InnstillingerModal
        erApen
        onClose={onClose}
        preferences={{ ...defaultPreferences, onboardingFullført: true }}
        onPreferenceChange={onPreferenceChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Vis introduksjonen på nytt" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Vis introduksjonen på nytt/ }).hasAttribute("disabled"),
    ).toBe(true);

    await act(async () => løsOppdatering?.());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
