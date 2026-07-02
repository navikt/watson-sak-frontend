import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGlitch } from "./useGlitch";

function settReduserBevegelse(matcher: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: matcher,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.useFakeTimers();
  settReduserBevegelse(false);
  document.body.className = "";
  document.body.innerHTML = "";
  document.body.removeAttribute("style");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useGlitch", () => {
  it("venter forsinkelsen før den legger til glitch-klasse og overlay", () => {
    const { result } = renderHook(() => useGlitch({ forsinkelseMs: 500, varighetMs: 900 }));

    act(() => result.current());
    expect(document.body.classList.contains("glitch-rgb-shift")).toBe(false);
    expect(document.querySelector(".glitch-overlay")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(document.body.classList.contains("glitch-rgb-shift")).toBe(true);
    expect(document.querySelector(".glitch-overlay")).not.toBeNull();
  });

  it("fjerner klasse og overlay igjen etter angitt varighet", () => {
    const { result } = renderHook(() => useGlitch({ forsinkelseMs: 500, varighetMs: 900 }));

    act(() => result.current());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(document.body.classList.contains("glitch-rgb-shift")).toBe(true);

    act(() => {
      vi.advanceTimersByTime(900);
    });

    expect(document.body.classList.contains("glitch-rgb-shift")).toBe(false);
    expect(document.querySelector(".glitch-overlay")).toBeNull();
  });

  it("spiller ikke av effekten når brukeren har skrudd på prefers-reduced-motion", () => {
    settReduserBevegelse(true);
    const { result } = renderHook(() => useGlitch({ forsinkelseMs: 500, varighetMs: 900 }));

    act(() => result.current());
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(document.body.classList.contains("glitch-rgb-shift")).toBe(false);
    expect(document.querySelector(".glitch-overlay")).toBeNull();
  });

  it("rydder opp forrige effekt hvis trigger kalles på nytt før forsinkelsen er over", () => {
    const { result } = renderHook(() => useGlitch({ forsinkelseMs: 500, varighetMs: 900 }));

    act(() => result.current());
    act(() => {
      vi.advanceTimersByTime(200);
      result.current();
      vi.advanceTimersByTime(500);
    });

    expect(document.querySelectorAll(".glitch-overlay")).toHaveLength(1);
    expect(document.body.classList.contains("glitch-rgb-shift")).toBe(true);
  });

  it("rydder opp forrige effekt hvis trigger kalles på nytt mens den spilles av", () => {
    const { result } = renderHook(() => useGlitch({ forsinkelseMs: 500, varighetMs: 900 }));

    act(() => result.current());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const førsteOverlay = document.querySelector(".glitch-overlay");

    act(() => {
      vi.advanceTimersByTime(300);
      result.current();
      vi.advanceTimersByTime(500);
    });

    const overlays = document.querySelectorAll(".glitch-overlay");
    expect(overlays).toHaveLength(1);
    expect(overlays[0]).not.toBe(førsteOverlay);
    expect(document.body.classList.contains("glitch-rgb-shift")).toBe(true);
  });

  it("rydder opp ved unmount", () => {
    const { result, unmount } = renderHook(() =>
      useGlitch({ forsinkelseMs: 500, varighetMs: 900 }),
    );

    act(() => result.current());
    act(() => {
      vi.advanceTimersByTime(500);
    });
    unmount();

    expect(document.querySelector(".glitch-overlay")).toBeNull();
    expect(document.body.classList.contains("glitch-rgb-shift")).toBe(false);
  });
});
