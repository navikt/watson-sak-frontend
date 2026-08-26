import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import { DelTilgangModal } from "./DelTilgangModal";

const submitMock = vi.fn();

vi.mock("react-router", () => ({
  useFetcher: () => ({
    submit: submitMock,
  }),
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
});
