import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfForhåndsvisning } from "./PdfForhåndsvisning";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PdfForhåndsvisning", () => {
  it("henter forhåndsvisning uten body — innholdet hentes fra databasen på backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<PdfForhåndsvisning url="/api/forhandsvisning" sistLagret={null} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/forhandsvisning",
      expect.objectContaining({ method: "POST" }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it("regenererer forhåndsvisningen når sistLagret endres", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      <PdfForhåndsvisning url="/api/forhandsvisning" sistLagret={null} />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender(
      <PdfForhåndsvisning
        url="/api/forhandsvisning"
        sistLagret={new Date("2026-01-01T00:00:00Z")}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("viser feilmelding når kallet feiler", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(<PdfForhåndsvisning url="/api/forhandsvisning" sistLagret={null} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByText("Kunne ikke oppdatere PDF-forhåndsvisningen.")).toBeTruthy();
  });
});
