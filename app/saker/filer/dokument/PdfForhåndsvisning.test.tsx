import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { PdfForhåndsvisning } from "./PdfForhåndsvisning";

const innhold: DokumentInnhold = [{ type: "p", children: [{ text: "Hei" }] }];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PdfForhåndsvisning", () => {
  it("sender tittel og innhold i request-body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <PdfForhåndsvisning
        url="/api/forhandsvisning"
        tittel="Vedtaksbrev"
        innhold={innhold}
        sistLagret={null}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/forhandsvisning",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tittel: "Vedtaksbrev", innhold }),
      }),
    );
  });

  it("regenererer forhåndsvisningen når innhold endres", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(["pdf"], { type: "application/pdf" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { rerender } = render(
      <PdfForhåndsvisning
        url="/api/forhandsvisning"
        tittel="Vedtaksbrev"
        innhold={innhold}
        sistLagret={null}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const nyttInnhold: DokumentInnhold = [{ type: "p", children: [{ text: "Nytt innhold" }] }];
    rerender(
      <PdfForhåndsvisning
        url="/api/forhandsvisning"
        tittel="Vedtaksbrev"
        innhold={nyttInnhold}
        sistLagret={new Date("2026-01-01T00:00:00Z")}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/forhandsvisning",
      expect.objectContaining({
        body: JSON.stringify({ tittel: "Vedtaksbrev", innhold: nyttInnhold }),
      }),
    );
  });

  it("viser feilmelding når kallet feiler", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    render(
      <PdfForhåndsvisning
        url="/api/forhandsvisning"
        tittel="Vedtaksbrev"
        innhold={innhold}
        sistLagret={null}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByText("Kunne ikke oppdatere PDF-forhåndsvisningen.")).toBeTruthy();
  });
});
