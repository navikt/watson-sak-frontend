import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpprettOppgaveModal } from "./OpprettOppgaveModal";

const submitMock = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useFetcher: () => ({
      state: "idle",
      submit: submitMock,
      Form: "form",
    }),
  };
});

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

const defaultProps = {
  sakId: "00000000-0000-4000-8000-000000000001",
  åpen: true,
  onClose: vi.fn(),
};

describe("OpprettOppgaveModal", () => {
  beforeEach(() => {
    submitMock.mockClear();
    defaultProps.onClose.mockClear();
  });

  it("viser oppgaveskjemaet med alle felter", () => {
    renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    expect(screen.getByLabelText("Oppgavetype")).toBeDefined();
    expect(screen.getByLabelText("Prioritet")).toBeDefined();
    expect(screen.getByLabelText("Frist")).toBeDefined();
    expect(screen.getByLabelText("Behandlende enhet")).toBeDefined();
    expect(screen.getByLabelText("Beskrivelse")).toBeDefined();
  });

  it("kaller submit med riktig payload", () => {
    renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Oppgavetype"), {
      target: { value: "vurder_henvendelse" },
    });
    fireEvent.change(screen.getByLabelText("Prioritet"), {
      target: { value: "HOY" },
    });
    fireEvent.change(screen.getByLabelText("Beskrivelse"), {
      target: { value: "En beskrivelse" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("handling")).toBe("opprett_oppgave");
    expect(formData.get("oppgavetype")).toBe("vurder_henvendelse");
    expect(formData.get("prioritet")).toBe("HOY");
    expect(formData.get("beskrivelse")).toBe("En beskrivelse");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("kaller onClose ved avbryt", () => {
    renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
