import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpprettJournalpostModal } from "./OpprettJournalpostModal";
import type { DokumentNode, FilResponse } from "~/saker/filer/typer";

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
  bruktIDokumenter: [],
};

const bildeFil: FilResponse = {
  id: "fil-uuid-2",
  filnavn: "screenshot.png",
  storrelse: 51200,
  contentType: "image/png",
  opprettetAv: "Z123456",
  opprettet: "2026-01-01T10:00:00Z",
  bruktIDokumenter: [],
};

const arkivertFil: FilResponse = {
  id: "fil-uuid-3",
  filnavn: "arkivert.pdf",
  storrelse: 20480,
  contentType: "application/pdf",
  opprettetAv: "Z123456",
  opprettet: "2026-01-01T10:00:00Z",
  bruktIDokumenter: [],
  arkivert: "2026-02-01T10:00:00Z",
  arkivertAv: "Z123456",
};

const ingenDokumenter: DokumentNode[] = [];

const dokument: DokumentNode = {
  id: "dok-uuid-1",
  tittel: "Vurderingsnotat",
  opprettetAv: "Z123456",
  opprettetDato: "2026-01-01",
  endretAv: "Z123456",
  endretDato: "2026-01-01",
  låsAv: null,
};

const arkivertDokument: DokumentNode = {
  ...dokument,
  id: "dok-uuid-2",
  tittel: "Arkivert notat",
  arkivert: "2026-02-01T10:00:00Z",
  arkivertAv: "Z123456",
};

const defaultProps = {
  sakId: "00000000-0000-4000-8000-000000000001",
  åpen: true,
  onClose: vi.fn(),
  filer: ingenFiler,
  dokumenter: ingenDokumenter,
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
    expect(screen.getByText("Du oppretter nå:")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Opprett" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("handling")).toBe("opprett_journalpost");
    expect(formData.get("journalposttype")).toBe("INNGAAENDE");
    expect(formData.get("tittel")).toBe("Min journalpost");
    expect(formData.get("innhold")).toBe("Innholdet i journalposten");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("viser melding om ingen filer eller dokumenter når begge er tomme", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} filer={ingenFiler} />);

    expect(screen.getByText(/Ingen filer eller dokumenter/)).toBeDefined();
  });

  it("viser kun PDF-filer i velgeren, ikke bilder", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} filer={[pdfFil, bildeFil]} />);

    expect(screen.getByRole("checkbox", { name: /rapport\.pdf/ })).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: /screenshot\.png/ })).toBeNull();
  });

  it("viser ikke arkiverte filer eller dokumenter i velgeren", () => {
    renderMedRouter(
      <OpprettJournalpostModal
        {...defaultProps}
        filer={[pdfFil, arkivertFil]}
        dokumenter={[dokument, arkivertDokument]}
      />,
    );

    expect(screen.getByRole("checkbox", { name: /rapport\.pdf/ })).toBeDefined();
    expect(screen.getByRole("checkbox", { name: /Vurderingsnotat/ })).toBeDefined();
    expect(screen.queryByRole("checkbox", { name: /arkivert\.pdf/ })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /Arkivert notat/ })).toBeNull();
  });

  it("viser filer og dokumenter i én samlet liste uten skille mellom vedlegg og dokumenter", () => {
    renderMedRouter(
      <OpprettJournalpostModal {...defaultProps} filer={[pdfFil]} dokumenter={[dokument]} />,
    );

    expect(screen.queryByText(/Vedlegg fra saken/)).toBeNull();
    expect(screen.getByRole("checkbox", { name: /rapport\.pdf/ })).toBeDefined();
    expect(screen.getByRole("checkbox", { name: /Vurderingsnotat/ })).toBeDefined();
  });

  it("inkluderer valgte vedlegg-ID-er i form payload", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} filer={[pdfFil]} />);

    fireEvent.click(screen.getByRole("radio", { name: "Notat" }));
    fireEvent.change(screen.getByLabelText("Tittel"), { target: { value: "Med vedlegg" } });
    fireEvent.change(screen.getByLabelText("Innhold"), { target: { value: "Innhold" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /rapport\.pdf/ }));

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    fireEvent.click(screen.getByRole("button", { name: "Opprett" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData] = submitMock.mock.calls[0];
    expect(formData.getAll("vedleggId")).toEqual(["fil-uuid-1"]);
    expect(formData.getAll("dokumentId")).toEqual([]);
  });

  it("inkluderer valgte dokument-ID-er i form payload", () => {
    renderMedRouter(
      <OpprettJournalpostModal {...defaultProps} filer={[]} dokumenter={[dokument]} />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Notat" }));
    fireEvent.change(screen.getByLabelText("Tittel"), { target: { value: "Med dokument" } });
    fireEvent.change(screen.getByLabelText("Innhold"), { target: { value: "Innhold" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Vurderingsnotat/ }));

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    fireEvent.click(screen.getByRole("button", { name: "Opprett" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData] = submitMock.mock.calls[0];
    expect(formData.getAll("dokumentId")).toEqual(["dok-uuid-1"]);
    expect(formData.getAll("vedleggId")).toEqual([]);
  });

  it("sender ingen vedleggId når ingen filer er valgt", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} filer={[pdfFil]} />);

    fireEvent.click(screen.getByRole("radio", { name: "Notat" }));
    fireEvent.change(screen.getByLabelText("Tittel"), { target: { value: "Uten vedlegg" } });
    fireEvent.change(screen.getByLabelText("Innhold"), { target: { value: "Innhold" } });

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    fireEvent.click(screen.getByRole("button", { name: "Opprett" }));

    const [formData] = submitMock.mock.calls[0];
    expect(formData.getAll("vedleggId")).toEqual([]);
  });

  it("deaktiverer flere valg når 10 filer/dokumenter allerede er valgt", () => {
    const mangeFiler: FilResponse[] = Array.from({ length: 10 }, (_, i) => ({
      id: `fil-${i}`,
      filnavn: `fil-${i}.pdf`,
      storrelse: 100,
      contentType: "application/pdf",
      opprettetAv: "Z123456",
      opprettet: "2026-01-01T10:00:00Z",
      bruktIDokumenter: [],
    }));

    renderMedRouter(
      <OpprettJournalpostModal {...defaultProps} filer={mangeFiler} dokumenter={[dokument]} />,
    );

    mangeFiler.forEach((fil) => {
      fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(fil.filnavn) }));
    });

    expect(screen.getByRole("checkbox", { name: /Vurderingsnotat/ })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("viser oppgaveskjema når 'Opprett og knytt til oppgave' er huket av", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    expect(screen.queryByLabelText("Oppgavetype")).toBeNull();

    fireEvent.click(screen.getByLabelText("Opprett og knytt til oppgave"));

    expect(screen.getByLabelText("Oppgavetype")).toBeDefined();
    expect(screen.getByLabelText("Prioritet")).toBeDefined();
    expect(screen.getByLabelText("Behandlende enhet")).toBeDefined();
    expect(screen.getByLabelText("Beskrivelse")).toBeDefined();
  });

  it("inkluderer oppgavedata i payload når 'Opprett og knytt til oppgave' er huket av", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("radio", { name: "Notat" }));
    fireEvent.change(screen.getByLabelText("Tittel"), {
      target: { value: "Journalpost med oppgave" },
    });
    fireEvent.change(screen.getByLabelText("Innhold"), {
      target: { value: "Innhold" },
    });
    fireEvent.click(screen.getByLabelText("Opprett og knytt til oppgave"));

    fireEvent.change(screen.getByLabelText("Oppgavetype"), {
      target: { value: "VUR" },
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
    expect(screen.getByText("Journalpost")).toBeDefined();
    expect(screen.getByText("Oppgave")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Opprett" }));

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData] = submitMock.mock.calls[0];
    expect(formData.get("handling")).toBe("opprett_journalpost");
    expect(formData.get("knyttTilOppgave")).toBe("true");
    expect(formData.get("oppgavetype")).toBe("VUR");
  });

  it("kaller onClose ved avbryt", () => {
    renderMedRouter(<OpprettJournalpostModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
