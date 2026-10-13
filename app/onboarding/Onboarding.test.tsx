import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Onboarding } from "./Onboarding";

const state = vi.hoisted(() => ({
  fullført: false,
  flaggPå: true,
  oppdaterPreference: vi.fn(async (_key: string, value: boolean) => {
    state.fullført = value;
  }),
  sporHendelse: vi.fn(),
}));

vi.mock("~/preferanser/PreferencesContext", () => ({
  usePreferences: () => ({
    preferences: { onboardingFullført: state.fullført },
    oppdaterPreference: state.oppdaterPreference,
  }),
}));
vi.mock("~/feature-toggling/useFeatureFlagg", () => ({
  useEnkeltFeatureFlagg: () => state.flaggPå,
}));
vi.mock("~/analytics/analytics", () => ({ sporHendelse: state.sporHendelse }));

beforeEach(() => {
  state.fullført = false;
  state.flaggPå = true;
  state.oppdaterPreference.mockClear();
  state.sporHendelse.mockClear();
});

if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
}
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: true, addListener: vi.fn(), removeListener: vi.fn() });
}

function visOnboarding(medMål = true) {
  const { container } = render(
    <>
      {medMål && (
        <nav id="sidebar-nav">
          <a href="/">Oversikt</a>
          <a href="/mine-saker">Mine saker</a>
        </nav>
      )}
      <Onboarding />
    </>,
  );
  return container;
}

describe("Onboarding", () => {
  it("vises ikke når onboarding er fullført eller flagget er av", () => {
    state.fullført = true;
    visOnboarding();
    expect(screen.queryByText(/Velkommen til Watson\sSak/)).toBeNull();

    state.fullført = false;
    state.flaggPå = false;
    const container = visOnboarding();
    expect(screen.queryByText(/Velkommen til Watson\sSak/)).toBeNull();
    expect(container.querySelector(".onboarding-forhåndsdekke")).toBeNull();
  });

  it("viser velkomst og går videre til meny-steget", async () => {
    visOnboarding();
    expect(await screen.findByRole("heading", { name: /Velkommen til Watson\sSak/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^(Neste|Vis meg rundt)$/ }));
    expect(
      await screen.findByRole("heading", { name: "Menyen er utgangspunktet ditt" }),
    ).toBeTruthy();
  });

  it("hopper over onboarding, lagrer preferansen og sporer gjeldende steg", async () => {
    visOnboarding();
    await screen.findByRole("heading", { name: /Velkommen til Watson\sSak/ });
    fireEvent.click(screen.getByRole("button", { name: "Hopp over" }));
    await waitFor(() =>
      expect(state.oppdaterPreference).toHaveBeenCalledWith("onboardingFullført", true),
    );
    expect(state.sporHendelse).toHaveBeenCalledWith("onboarding hoppet over", {
      steg: "velkomst",
      stegnummer: 1,
    });
  });

  it("lukker onboarding mens lagring av preferansen fortsatt venter", async () => {
    let løsOppdatering: (() => void) | undefined;
    state.oppdaterPreference.mockImplementation((_key, value) => {
      state.fullført = value;
      return new Promise<void>((resolve) => (løsOppdatering = resolve));
    });
    visOnboarding();
    await screen.findByRole("heading", { name: /Velkommen til Watson\sSak/ });

    fireEvent.click(screen.getByRole("button", { name: "Hopp over" }));

    await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
    expect(state.oppdaterPreference).toHaveBeenCalledWith("onboardingFullført", true);
    await act(async () => løsOppdatering?.());
  });

  it("viser Idéportalen på siste steg og fullfører onboarding", async () => {
    visOnboarding(false);
    fireEvent.click(await screen.findByRole("button", { name: /^(Neste|Vis meg rundt)$/ }));
    expect(await screen.findByRole("heading", { name: "Lykke til!" })).toBeTruthy();
    const lenke = screen.getByRole("link", { name: "Gå til Idéportalen" });
    expect(lenke.getAttribute("href")).toBe("https://watsonsak.ideas.aha.io");
    expect(lenke.getAttribute("target")).toBe("_blank");
    expect(lenke.getAttribute("rel")).toBe("noopener noreferrer");
    fireEvent.click(screen.getByRole("button", { name: "Kom i gang" }));
    await waitFor(() =>
      expect(state.oppdaterPreference).toHaveBeenCalledWith("onboardingFullført", true),
    );
    expect(state.sporHendelse).toHaveBeenCalledWith("onboarding fullført");
  });

  it("hopper over med Escape", async () => {
    visOnboarding(false);
    await screen.findByRole("heading", { name: /Velkommen til Watson\sSak/ });
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(state.oppdaterPreference).toHaveBeenCalledWith("onboardingFullført", true),
    );
    expect(state.sporHendelse).toHaveBeenCalledWith("onboarding hoppet over", {
      steg: "velkomst",
      stegnummer: 1,
    });
  });

  it("kan startes på nytt i samme mount etter at den er fullført", async () => {
    const innhold = () => (
      <>
        <nav id="sidebar-nav">
          <a href="/">Oversikt</a>
        </nav>
        <Onboarding />
      </>
    );
    const { rerender, container } = render(innhold());
    await screen.findByRole("heading", { name: /Velkommen til Watson\sSak/ });
    fireEvent.click(screen.getByRole("button", { name: "Hopp over" }));
    await waitFor(() => expect(state.fullført).toBe(true));
    rerender(innhold());
    await waitFor(() => expect(container.querySelector("dialog")).toBeNull());

    // Som «Vis introduksjonen på nytt» i innstillinger.
    state.fullført = false;
    rerender(innhold());
    expect(await screen.findByRole("heading", { name: /Velkommen til Watson\sSak/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vis meg rundt" })).toBeTruthy();
  });

  it("hopper over steg med mål som ikke finnes", async () => {
    visOnboarding(false);
    fireEvent.click(await screen.findByRole("button", { name: /^(Neste|Vis meg rundt)$/ }));
    expect(await screen.findByRole("heading", { name: "Lykke til!" })).toBeTruthy();
    expect(
      screen.getByText((_text, element) => element?.textContent === "Steg 2 av 2", {
        selector: "span",
      }),
    ).toBeTruthy();
  });
});
