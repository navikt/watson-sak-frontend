import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpprettNotatModal } from "./OpprettNotatModal";

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

describe("OpprettNotatModal", () => {
  beforeEach(() => {
    submitMock.mockClear();
  });

  it("validerer at notat er påkrevd – submit kalles ikke når notat er tomt", () => {
    renderMedRouter(<OpprettNotatModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).not.toHaveBeenCalled();
  });

  it("validerer at notat er påkrevd – submit kalles ikke for kun whitespace", () => {
    renderMedRouter(<OpprettNotatModal {...defaultProps} />);

    const textarea = screen.getByLabelText("Notat");
    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).not.toHaveBeenCalled();
  });

  it("kaller submit med forventet payload når notat er fylt ut", () => {
    renderMedRouter(<OpprettNotatModal {...defaultProps} />);

    const textarea = screen.getByLabelText("Notat");
    fireEvent.change(textarea, { target: { value: "Et viktig notat" } });

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("handling")).toBe("send_notat");
    expect(formData.get("notat")).toBe("Et viktig notat");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("inkluderer oppgavetype i payload når 'Knytt til oppgave' er huket av", () => {
    renderMedRouter(<OpprettNotatModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Notat"), {
      target: { value: "Notat med oppgave" },
    });
    fireEvent.click(screen.getByLabelText("Knytt til oppgave"));

    const oppgavetypeSelect = screen.getByLabelText("Oppgavetype");
    fireEvent.change(oppgavetypeSelect, { target: { value: "vurder_dokument" } });

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData.get("handling")).toBe("send_notat");
    expect(formData.get("notat")).toBe("Notat med oppgave");
    expect(formData.get("knyttTilOppgave")).toBe("true");
    expect(formData.get("oppgavetype")).toBe("Vurder dokument");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("lar saksbehandler søke opp og sende behandlende enhet", async () => {
    renderMedRouter(<OpprettNotatModal {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Notat"), {
      target: { value: "Notat med behandlende enhet" },
    });
    fireEvent.click(screen.getByLabelText("Knytt til oppgave"));

    const behandlendeEnhetCombobox = screen.getByRole("combobox", {
      name: "Behandlende enhet",
    });
    fireEvent.change(behandlendeEnhetCombobox, { target: { value: "4111" } });
    fireEvent.pointerUp(
      await screen.findByRole("option", { name: "4111 - Nav kontaktsenter Rogaland" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData.get("notat")).toBe("Notat med behandlende enhet");
    expect(formData.get("knyttTilOppgave")).toBe("true");
    expect(formData.get("behandlendeEnhet")).toBe("4111");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });
});
