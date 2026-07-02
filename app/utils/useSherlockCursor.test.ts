import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSherlockCursor } from "./useSherlockCursor";

beforeEach(() => {
  vi.useFakeTimers();
  document.body.className = "";
});

afterEach(() => {
  vi.useRealTimers();
});

function trykkEscape() {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}

describe("useSherlockCursor", () => {
  it("legger til sherlock-cursor-klassen på body når trigger kalles", () => {
    const { result } = renderHook(() => useSherlockCursor());

    act(() => result.current());

    expect(document.body.classList.contains("sherlock-cursor")).toBe(true);
  });

  it("fjerner klassen igjen etter angitt varighet", () => {
    const { result } = renderHook(() => useSherlockCursor(30_000));

    act(() => result.current());
    expect(document.body.classList.contains("sherlock-cursor")).toBe(true);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(document.body.classList.contains("sherlock-cursor")).toBe(false);
  });

  it("fjerner klassen med én gang hvis brukeren trykker Escape", () => {
    const { result } = renderHook(() => useSherlockCursor(30_000));

    act(() => result.current());
    expect(document.body.classList.contains("sherlock-cursor")).toBe(true);

    act(() => trykkEscape());

    expect(document.body.classList.contains("sherlock-cursor")).toBe(false);
  });

  it("ignorerer andre tastetrykk enn Escape", () => {
    const { result } = renderHook(() => useSherlockCursor(30_000));

    act(() => result.current());
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(document.body.classList.contains("sherlock-cursor")).toBe(true);
  });

  it("rydder opp forrige effekt hvis trigger kalles på nytt", () => {
    const { result } = renderHook(() => useSherlockCursor(30_000));

    act(() => result.current());
    act(() => {
      vi.advanceTimersByTime(10_000);
      result.current();
    });

    expect(document.body.classList.contains("sherlock-cursor")).toBe(true);

    // Skal ikke være noen dobbel escape-lytter registrert – ett Escape-trykk
    // holder for å avslutte den nye effekten.
    act(() => trykkEscape());
    expect(document.body.classList.contains("sherlock-cursor")).toBe(false);
  });

  it("rydder opp ved unmount", () => {
    const { result, unmount } = renderHook(() => useSherlockCursor(30_000));

    act(() => result.current());
    unmount();

    expect(document.body.classList.contains("sherlock-cursor")).toBe(false);
  });
});
