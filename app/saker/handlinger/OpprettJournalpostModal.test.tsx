import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpprettJournalpostModal } from "./OpprettJournalpostModal";
import type { FilResponse } from "~/saker/filer/typer";

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

const ingenFiler: FilResponse[] = [];

const pdfFil: FilResponse = {
  id: "fil-uuid-1",
  filnavn: "rapport.pdf",
  storrelse: 102400,
  contentType: "application/pdf",
  opprettetAv: "Z123456",
  opprettet: "2026-01-01T10:00:00Z",
};

const bildeFil: FilResponse = {
  id: "fil-uuid-2",
  filnavn: "screenshot.png",
  storrelse: 51200,
  contentType: "image/png",
  opprettetAv: "Z123456",
  opprettet: "2026-01-01T10:00:00Z",
};

const defaultProps = {
  sakId: "00000000-0000-4000-8000-000000000001",
  åpen: true,
  onClose: vi.fn(),
  filer: ingenFiler,
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

  it("viser melding om ingen PDF-filer når filer er tom", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} filer={ingenFiler} />);

    expect(screen.getByText(/Ingen PDF-filer lastet opp/)).toBeDefined();
  });

  it("viser kun PDF-filer i vedlegg-velgeren, ikke bilder", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} filer={[pdfFil, bildeFil]} />);

    expect(screen.getByRole("checkbox", { name: /rapport\.pdf/ })).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: /screenshot\.png/ })).toBeNull();
  });

  it("inkluderer valgte vedlegg-ID-er i form payload", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} filer={[pdfFil]} />);

    fireEvent.click(screen.getByRole("radio", { name: "Notat" }));
    fireEvent.change(screen.getByLabelText("Tittel"), { target: { value: "Med vedlegg" } });
    fireEvent.change(screen.getByLabelText("Innhold"), { target: { value: "Innhold" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /rapport\.pdf/ }));

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData] = submitMock.mock.calls[0];
    expect(formData.getAll("vedleggId")).toEqual(["fil-uuid-1"]);
  });

  it("sender ingen vedleggId når ingen filer er valgt", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} filer={[pdfFil]} />);

    fireEvent.click(screen.getByRole("radio", { name: "Notat" }));
    fireEvent.change(screen.getByLabelText("Tittel"), { target: { value: "Uten vedlegg" } });
    fireEvent.change(screen.getByLabelText("Innhold"), { target: { value: "Innhold" } });

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    const [formData] = submitMock.mock.calls[0];
    expect(formData.getAll("vedleggId")).toEqual([]);
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

  it("kaller onClose ved avbryt", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
