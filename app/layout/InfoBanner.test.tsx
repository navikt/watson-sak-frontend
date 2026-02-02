import { act, render, screen } from "@testing-library/react";
import * as reactRouterModule from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InfoBanner } from "./InfoBanner";

// Mock dependencies
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    unstable_useRoute: vi.fn(),
  };
});

type MockRoute = {
  loaderData?: {
    statusmelding?:
      | { tittel: string; beskrivelse?: string }
      | false
      | undefined;
  };
};

describe("InfoBanner", () => {
  const mockUseRoute = vi.mocked(reactRouterModule.unstable_useRoute);

  // Hjelpefunksjon for å mocke useRoute med riktig type
  const mockRoute = (route: MockRoute) => {
    // @ts-expect-error - Vi mock-er useRoute med kun loaderData
    mockUseRoute.mockReturnValue(route);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returnerer null når det ikke er statusmelding", () => {
    mockRoute({
      loaderData: { statusmelding: undefined },
    });

    const { container } = render(<InfoBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("returnerer null når statusmelding er false", () => {
    mockRoute({
      loaderData: { statusmelding: false },
    });

    const { container } = render(<InfoBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("skjuler banner når lukk-knappen klikkes", () => {
    mockRoute({
      loaderData: {
        statusmelding: { tittel: "Test melding", beskrivelse: "Beskrivelse" },
      },
    });

    const { container } = render(<InfoBanner />);

    // Verifiser at banneren vises først
    expect(screen.getByText("Test melding")).toBeDefined();

    // Klikk på lukk-knappen
    const lukkKnapp = screen.getByRole("button", { name: /lukk/i });
    act(() => {
      lukkKnapp.click();
    });

    // Verifiser at banneren er skjult
    expect(container.firstChild).toBeNull();
  });

  it("viser tittel fra statusmelding", () => {
    mockRoute({
      loaderData: {
        statusmelding: { tittel: "Viktig melding" },
      },
    });

    render(<InfoBanner />);
    expect(screen.getByText("Viktig melding")).toBeDefined();
  });

  it("viser beskrivelse når den finnes", () => {
    mockRoute({
      loaderData: {
        statusmelding: {
          tittel: "Viktig melding",
          beskrivelse: "Dette er en beskrivelse",
        },
      },
    });

    render(<InfoBanner />);
    expect(screen.getByText("Dette er en beskrivelse")).toBeDefined();
  });

  it("viser ikke beskrivelse når den ikke finnes", () => {
    mockRoute({
      loaderData: {
        statusmelding: {
          tittel: "Viktig melding",
        },
      },
    });

    render(<InfoBanner />);
    expect(screen.getByText("Viktig melding")).toBeDefined();
    expect(screen.queryByText(/beskrivelse/i)).toBeNull();
  });

  it("har riktig CSS-klasser", () => {
    mockRoute({
      loaderData: {
        statusmelding: {
          tittel: "Test melding",
          beskrivelse: "Beskrivelse",
        },
      },
    });

    const { container } = render(<InfoBanner />);

    // Sjekk at GlobalAlert har mb-4 klasse
    const globalAlert = container.querySelector(".mb-4");
    expect(globalAlert).not.toBeNull();

    // Sjekk at header og content har px-4 klasse
    const headers = container.querySelectorAll(".px-4");
    expect(headers.length).toBeGreaterThan(0);
  });

  it("viser GlobalAlert med status announcement", () => {
    mockRoute({
      loaderData: {
        statusmelding: { tittel: "Test melding" },
      },
    });

    render(<InfoBanner />);

    // Sjekk at komponenten faktisk rendrer
    expect(screen.getByText("Test melding")).toBeDefined();
  });

  it("viser både tittel og beskrivelse samtidig", () => {
    mockRoute({
      loaderData: {
        statusmelding: {
          tittel: "Systemvedlikehold",
          beskrivelse: "Systemet vil være nede mellom 02:00 og 04:00",
        },
      },
    });

    render(<InfoBanner />);

    expect(screen.getByText("Systemvedlikehold")).toBeDefined();
    expect(
      screen.getByText("Systemet vil være nede mellom 02:00 og 04:00"),
    ).toBeDefined();
  });

  it("viser banner ved første render når statusmelding finnes", () => {
    mockRoute({
      loaderData: {
        statusmelding: { tittel: "Test" },
      },
    });

    render(<InfoBanner />);

    // Verifiser at banneren vises ved første render (useDisclosure initialiseres med true)
    expect(screen.getByText("Test")).toBeDefined();
  });
});
