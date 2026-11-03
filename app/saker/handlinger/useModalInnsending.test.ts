import { act, render, renderHook, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { INNSENDINGSFEIL } from "~/feilhåndtering/feilmeldinger";
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
    rerender({ fetcher: { state: "submitting" } as Fetcher });
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
    rerender({ fetcher: { state: "submitting" } as Fetcher });
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
    rerender({ fetcher: { state: "submitting" } as Fetcher });
    rerender({
      fetcher: {
        state: "idle",
        data: { ok: false, feil: "Intern feil", feilId: "feil-123", teknisk: true, usikker: false },
      },
    });

    render(
      createElement(Innsendingsfeil, {
        svar: result.current.tekniskFeil,
        tekster: INNSENDINGSFEIL.overførAnsvar,
      }),
    );

    expect(onSuksess).not.toHaveBeenCalled();
    expect(screen.getByText("Vi fikk ikke overført saken")).toBeDefined();
    expect(screen.getByText("feil-123")).toBeDefined();
  });

  it("tar med at vi ikke vet om endringen ble lagret", () => {
    const { result, rerender } = renderHook(({ fetcher }) => useModalInnsending(fetcher, vi.fn()), {
      initialProps: { fetcher: { state: "idle" } as Fetcher },
    });

    act(() => result.current.markerSendt());
    rerender({ fetcher: { state: "submitting" } as Fetcher });
    rerender({
      fetcher: {
        state: "idle",
        data: { ok: false, feil: "Intern feil", feilId: "feil-9", teknisk: true, usikker: true },
      },
    });

    render(
      createElement(Innsendingsfeil, {
        svar: result.current.tekniskFeil,
        tekster: INNSENDINGSFEIL.overførAnsvar,
      }),
    );

    expect(screen.getByText("Vi vet ikke om saken ble overført")).toBeDefined();
  });

  it("behandler svaret på nytt forsøk, ikke det gamle, etter en teknisk feil", () => {
    const tekniskFeil = { ok: false, feil: "Intern feil", feilId: "feil-1", teknisk: true };
    const { result, rerender } = renderHook(
      ({ fetcher, onSuksess }) => useModalInnsending(fetcher, onSuksess),
      { initialProps: { fetcher: { state: "idle" } as Fetcher, onSuksess: vi.fn() } },
    );

    act(() => result.current.markerSendt());
    rerender({ fetcher: { state: "submitting" }, onSuksess: vi.fn() });
    rerender({ fetcher: { state: "idle", data: tekniskFeil }, onSuksess: vi.fn() });
    expect(result.current.tekniskFeil?.feilId).toBe("feil-1");

    // Nytt forsøk: render med det gamle svaret og ny onSuksess før fetcheren starter.
    const onSuksess = vi.fn();
    act(() => result.current.markerSendt());
    rerender({ fetcher: { state: "idle", data: tekniskFeil }, onSuksess });
    expect(onSuksess).not.toHaveBeenCalled();

    rerender({ fetcher: { state: "submitting", data: tekniskFeil }, onSuksess });
    rerender({ fetcher: { state: "idle", data: { ok: true } }, onSuksess });
    expect(onSuksess).toHaveBeenCalledOnce();
    expect(result.current.tekniskFeil).toBeNull();
  });
});
