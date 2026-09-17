import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import { TildelSaksbehandlerModal } from "./TildelSaksbehandlerModal";

const submitMock = vi.fn();

vi.mock("react-router", () => ({
  useFetcher: () => ({
    state: "idle",
    submit: submitMock,
    Form: "form",
  }),
}));

const saksbehandlerDetaljer: KontrollsakSaksbehandler[] = [
  { navIdent: "Z123456", navn: "Kari Nordmann", enhet: "4812" },
  { navIdent: "Z999999", navn: "Saks Behandlersen", enhet: "4812" },
];

describe("TildelSaksbehandlerModal", () => {
  beforeEach(() => {
    submitMock.mockClear();
  });

  it("lar brukeren søke etter og velge en saksbehandler", async () => {
    render(
      <TildelSaksbehandlerModal
        sakId="101"
        saksbehandlere={[]}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        åpen={true}
        onClose={vi.fn()}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Saksbehandler" });

    await act(async () => {
      fireEvent.change(combobox, { target: { value: "Saks" } });
    });

    expect(screen.getByText("Saks Behandlersen (Z999999)")).toBeDefined();

    await act(async () => {
      fireEvent.pointerUp(screen.getByRole("option", { name: "Saks Behandlersen (Z999999)" }));
    });

    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Tildel" }).disabled).toBe(false);
    expect(document.querySelector<HTMLInputElement>('input[type="hidden"]')?.value).toBe("Z999999");
  });
});
