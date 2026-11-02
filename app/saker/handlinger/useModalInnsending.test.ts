import { act, render, renderHook, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { useModalInnsending } from "./useModalInnsending";

type Fetcher = Parameters<typeof useModalInnsending>[0];

describe("useModalInnsending", () => {
  it("lukker ved suksess", () => {
    const onSuksess = vi.fn();
    const { result, rerender } = renderHook(
      ({ fetcher }) => useModalInnsending(fetcher, onSuksess),
      {
        initialProps: { fetcher: { state: "idle" } as Fetcher },
      },
    );

    act(() => result.current.markerSendt());
    rerender({ fetcher: { state: "idle", data: { ok: true } } });

    expect(onSuksess).toHaveBeenCalledOnce();
  });

  it("holder modalen åpen og viser meldingen ved avvist handling", () => {
    const onSuksess = vi.fn();
    const { result, rerender } = renderHook(
      ({ fetcher }) => useModalInnsending(fetcher, onSuksess),
      {
        initialProps: { fetcher: { state: "idle" } as Fetcher },
      },
    );

    act(() => result.current.markerSendt());
    rerender({ fetcher: { state: "idle", data: { ok: false, feil: "Saken er avsluttet" } } });

    expect(onSuksess).not.toHaveBeenCalled();
    expect(result.current.feilmelding).toBe("Saken er avsluttet");
  });

  it("viser den kontekstuelle feilen og feil-ID ved teknisk feil", () => {
    const onSuksess = vi.fn();
    const { result, rerender } = renderHook(
      ({ fetcher }) => useModalInnsending(fetcher, onSuksess),
      {
        initialProps: { fetcher: { state: "idle" } as Fetcher },
      },
    );

    act(() => result.current.markerSendt());
    rerender({
      fetcher: {
        state: "idle",
        data: { ok: false, feil: "Intern feil", feilId: "feil-123", teknisk: true },
      },
    });

    render(createElement(Innsendingsfeil, { svar: result.current.tekniskFeil }));

    expect(onSuksess).not.toHaveBeenCalled();
    expect(screen.getByText("Vi fikk ikke lagret endringen").textContent).toBe(
      "Vi fikk ikke lagret endringen",
    );
    expect(screen.getByText("feil-123").textContent).toBe("feil-123");
  });
});
