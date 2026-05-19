import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpprettJournalpostModal } from "./OpprettJournalpostModal";

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

describe("OpprettJournalpostModal", () => {
  beforeEach(() => {
    submitMock.mockClear();
    defaultProps.onClose.mockClear();
  });

  it("validerer at tittel og innhold er påkrevd – submit kalles ikke når feltene er tomme", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).not.toHaveBeenCalled();
  });

  it("kaller submit med riktig payload når obligatoriske felter er fylt ut", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("radio", { name: "Inngående" }));
    fireEvent.change(screen.getByLabelText("Tittel"), {
      target: { value: "Min journalpost" },
    });
    fireEvent.change(screen.getByLabelText("Innhold"), {
      target: { value: "Innholdet i journalposten" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("handling")).toBe("opprett_journalpost");
    expect(formData.get("journalposttype")).toBe("INNGAAENDE");
    expect(formData.get("tittel")).toBe("Min journalpost");
    expect(formData.get("innhold")).toBe("Innholdet i journalposten");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("viser oppgaveskjema når 'Knytt til oppgave' er huket av", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    expect(screen.queryByLabelText("Oppgavetype")).toBeNull();

    fireEvent.click(screen.getByLabelText("Knytt til oppgave"));

    expect(screen.getByLabelText("Oppgavetype")).toBeDefined();
    expect(screen.getByLabelText("Prioritet")).toBeDefined();
    expect(screen.getByLabelText("Behandlende enhet")).toBeDefined();
    expect(screen.getByLabelText("Beskrivelse")).toBeDefined();
  });

  it("inkluderer oppgavedata i payload når 'Knytt til oppgave' er huket av", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("radio", { name: "Notat" }));
    fireEvent.change(screen.getByLabelText("Tittel"), {
      target: { value: "Journalpost med oppgave" },
    });
    fireEvent.change(screen.getByLabelText("Innhold"), {
      target: { value: "Innhold" },
    });
    fireEvent.click(screen.getByLabelText("Knytt til oppgave"));

    fireEvent.change(screen.getByLabelText("Oppgavetype"), {
      target: { value: "vurder_dokument" },
    });
    fireEvent.change(screen.getByLabelText("Prioritet"), {
      target: { value: "NORMAL" },
    });
    const fristInput = document.querySelector('input[name="frist"]') as HTMLInputElement;
    fireEvent.change(fristInput, { target: { value: "2026-06-01" } });
    const enhetInput = document.querySelector('input[name="behandlendeEnhet"]') as HTMLInputElement;
    fireEvent.change(enhetInput, { target: { value: "4100" } });
    fireEvent.change(screen.getByLabelText("Beskrivelse"), {
      target: { value: "Oppgavebeskrivelse" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData] = submitMock.mock.calls[0];
    expect(formData.get("handling")).toBe("opprett_journalpost");
    expect(formData.get("knyttTilOppgave")).toBe("true");
    expect(formData.get("oppgavetype")).toBe("vurder_dokument");
  });

  it("viser filopplaster", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    expect(screen.getByText(/Last opp vedlegg/)).toBeDefined();
  });

  it("kaller onClose ved avbryt", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
