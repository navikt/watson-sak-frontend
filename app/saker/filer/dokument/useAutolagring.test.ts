import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { useAutolagring } from "./useAutolagring";

const innhold: DokumentInnhold = { type: "doc" };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAutolagring", () => {
  it("lagrer etter debounce-forsinkelsen", async () => {
    const lagre = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutolagring({ lagre, forsinkelseMs: 800 }));

    act(() => result.current.registrerEndring({ tittel: "A", innhold }));
    expect(result.current.status).toBe("endret");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(799);
    });
    expect(lagre).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(lagre).toHaveBeenCalledTimes(1);
    expect(lagre).toHaveBeenCalledWith({ tittel: "A", innhold }, { forlater: false });
    expect(result.current.status).toBe("lagret");
    expect(result.current.sistLagret).toBeInstanceOf(Date);
  });

  it("slår sammen raske endringer til én lagring med nyeste data", async () => {
    const lagre = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutolagring({ lagre, forsinkelseMs: 800 }));

    act(() => result.current.registrerEndring({ tittel: "A", innhold }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    act(() => result.current.registrerEndring({ tittel: "B", innhold }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(lagre).toHaveBeenCalledTimes(1);
    expect(lagre).toHaveBeenCalledWith({ tittel: "B", innhold }, { forlater: false });
  });

  it("beholder endringer og viser feilstatus når lagring feiler", async () => {
    const lagre = vi.fn().mockRejectedValueOnce(new Error("feil")).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutolagring({ lagre, forsinkelseMs: 800 }));

    act(() => result.current.registrerEndring({ tittel: "A", innhold }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(result.current.status).toBe("feil");

    // En ny endring forsøker lagring på nytt – ingenting går tapt.
    act(() => result.current.registrerEndring({ tittel: "B", innhold }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(result.current.status).toBe("lagret");
    expect(lagre).toHaveBeenLastCalledWith({ tittel: "B", innhold }, { forlater: false });
  });

  it("flusher med forlater=true (keepalive) ved unmount", async () => {
    const lagre = vi.fn().mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useAutolagring({ lagre, forsinkelseMs: 800 }));

    // Endre uten å la debouncen fullføre, og rive ned komponenten (route-bytte).
    act(() => result.current.registrerEndring({ tittel: "A", innhold }));
    unmount();

    expect(lagre).toHaveBeenCalledTimes(1);
    expect(lagre).toHaveBeenCalledWith({ tittel: "A", innhold }, { forlater: true });
  });
});
