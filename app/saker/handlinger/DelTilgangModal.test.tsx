import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import { DelTilgangModal } from "./DelTilgangModal";

const { fetcherMock, submitMock } = vi.hoisted(() => ({
  fetcherMock: { state: "idle" as "idle" | "submitting", data: undefined as unknown },
  submitMock: vi.fn(),
}));

vi.mock("react-router", () => ({
  useFetcher: () => ({ ...fetcherMock, submit: submitMock }),
}));

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    enhet: "4812",
  }),
}));

const saksbehandlerDetaljer: KontrollsakSaksbehandler[] = [
  { navIdent: "Z999999", navn: "Test Saksbehandler", enhet: "4812" },
  { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
];

describe("DelTilgangModal", () => {
  beforeEach(() => {
    submitMock.mockClear();
    fetcherMock.state = "idle";
    fetcherMock.data = undefined;
  });

  it("viser ikke innlogget saksbehandler som et delingsvalg", async () => {
    render(
      <DelTilgangModal
        sakId="101"
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        åpen={true}
        onClose={vi.fn()}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("combobox", { name: "Saksbehandler" }));
    });

    expect(screen.queryByText("Test Saksbehandler (Z999999)")).toBeNull();
    expect(screen.getByText("Ola Saksbehandler (Z123456)")).toBeDefined();
  });

  it("viser teknisk feil og beholder valget når deling feiler", async () => {
    const onClose = vi.fn();
    const props = {
      sakId: "101",
      saksbehandlerDetaljer,
      åpen: true,
      onClose,
    };
    const { rerender } = render(<DelTilgangModal {...props} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("combobox", { name: "Saksbehandler" }));
    });
    await act(async () => {
      fireEvent.pointerUp(
        await screen.findByRole("option", { name: "Ola Saksbehandler (Z123456)" }),
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Del tilgang" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(submitMock).toHaveBeenCalledOnce();

    await act(async () => {
      fetcherMock.state = "submitting";
      rerender(<DelTilgangModal {...props} />);
    });
    await act(async () => {
      fetcherMock.state = "idle";
      fetcherMock.data = { ok: false, feil: "intern feil", feilId: "ERR-123", teknisk: true };
      rerender(<DelTilgangModal {...props} />);
    });

    expect(screen.getByText("Vi fikk ikke lagret endringen")).toBeDefined();
    expect(screen.getByText("ERR-123")).toBeDefined();
    // Valget står igjen, så brukeren kan prøve på nytt uten å velge saksbehandler igjen.
    expect(
      (screen.getByRole("button", { name: "Del tilgang" }) as HTMLButtonElement).disabled,
    ).toBe(false);
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });
});
