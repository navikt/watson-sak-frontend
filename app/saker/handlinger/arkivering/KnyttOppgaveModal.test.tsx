import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KnyttOppgaveModal } from "./KnyttOppgaveModal";

const submitMock = vi.fn();
const kodeverkTema = vi.hoisted(() => ({ verdi: undefined as string | undefined }));

vi.mock("../useOppgavekodeverk", () => ({
  useOppgavekodeverk: (tema: string | undefined) => {
    kodeverkTema.verdi = tema;
    return {
      prøvIgjen: vi.fn(),
      tilstand: {
        status: "ok",
        kodeverk: {
          oppgavetyper: [{ oppgavetype: "VURD_HENV", term: "Vurder henvendelse" }],
          gjelderverdier: [{ behandlingstema: "ab0356", behandlingstemaTerm: "Dagpenger" }],
        },
      },
    };
  },
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useFetcher: () => ({ state: "idle", data: undefined, submit: submitMock, Form: "form" }),
  };
});

function settSkjult(navn: string, verdi: string) {
  fireEvent.change(document.querySelector(`input[name="${navn}"]`) as HTMLInputElement, {
    target: { value: verdi },
  });
}

describe("KnyttOppgaveModal", () => {
  beforeEach(() => submitMock.mockClear());

  it("viser journalføringen og oppretter oppgave knyttet til journalposten med arvet tema", async () => {
    render(
      <KnyttOppgaveModal
        sakId="00000000-0000-4000-8000-000000000001"
        journalpost={{
          journalpostId: "jp-1",
          tema: "KTA",
          dokumentbeskrivelse: "Orienteringsnotat",
          dokumentnavn: ["rapport.pdf", "Vurderingsnotat"],
        }}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Knytt oppgave til de journalførte dokumentene" }),
    ).toBeDefined();
    expect(screen.getByText("Kontroll anmeldelse")).toBeDefined();
    expect(screen.getByText("Orienteringsnotat")).toBeDefined();
    expect(screen.getByText("rapport.pdf")).toBeDefined();
    expect(screen.queryByLabelText("Tema")).toBeNull();
    expect(kodeverkTema.verdi).toBe("KTA");

    fireEvent.change(screen.getByLabelText("Oppgavetype"), { target: { value: "VURD_HENV" } });
    fireEvent.change(screen.getByLabelText("Prioritet"), { target: { value: "HOY" } });
    settSkjult("frist", "2026-06-01");
    settSkjult("behandlendeEnhet", "4100");
    settSkjult("gjelderverdi", "ab0356");
    fireEvent.change(screen.getByLabelText("Beskrivelse"), { target: { value: "Følg opp" } });
    fireEvent.click(screen.getByRole("button", { name: "Opprett oppgave" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    const [formData] = submitMock.mock.calls[0];
    expect(formData.get("handling")).toBe("opprett_oppgave");
    expect(formData.get("tema")).toBe("KTA");
    expect(formData.get("journalpostId")).toBe("jp-1");
    expect(formData.get("gjelderverdi")).toBe("ab0356");
  });

  it("bruker entall i tittelen når bare ett dokument er journalført", () => {
    render(
      <KnyttOppgaveModal
        sakId="00000000-0000-4000-8000-000000000001"
        journalpost={{
          journalpostId: "jp-1",
          tema: "KTA",
          dokumentbeskrivelse: "Orienteringsnotat",
          dokumentnavn: ["rapport.pdf"],
        }}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Knytt oppgave til det journalførte dokumentet" }),
    ).toBeDefined();
  });
});
