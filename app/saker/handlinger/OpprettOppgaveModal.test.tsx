import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ArkivOversikt } from "~/saker/arkiv/useArkivJournalposter";
import { OpprettOppgaveModal } from "./OpprettOppgaveModal";
import type { OppgavekodeverkTilstand } from "./useOppgavekodeverk";

const submitMock = vi.fn();

const kodeverkOk: OppgavekodeverkTilstand = {
  status: "ok",
  kodeverk: {
    oppgavetyper: [{ oppgavetype: "VURD_HENV", term: "Vurder henvendelse" }],
    gjelderverdier: [{ behandlingstema: "ab0356", behandlingstemaTerm: "Dagpenger" }],
  },
};
const kodeverkMock = vi.hoisted(() => ({
  tilstand: undefined as unknown as OppgavekodeverkTilstand,
  prøvIgjen: vi.fn(),
  tema: undefined as string | undefined,
}));

vi.mock("./useOppgavekodeverk", () => ({
  useOppgavekodeverk: (tema: string | undefined) => {
    kodeverkMock.tema = tema;
    return kodeverkMock;
  },
}));

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

async function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  const resultat = render(<RouterProvider router={router} />);
  await waitFor(() => {});
  return resultat;
}

const arkiv: ArkivOversikt = {
  kanSeArkiv: true,
  hent: vi.fn(),
  tilstand: {
    status: "ok",
    journalposter: [
      {
        journalpostId: "jp-1",
        datoOpprettet: "2026-05-04T10:00:00",
        journalposttype: "N",
        journalstatus: "JOURNALFOERT",
        tittel: "Orienteringsnotat",
        tema: "KTR",
        temanavn: "Kontroll",
        avsenderMottaker: null,
        dokumenter: [],
      },
    ],
  },
};

const defaultProps = {
  sakId: "00000000-0000-4000-8000-000000000001",
  åpen: true,
  onClose: vi.fn(),
  arkiv,
};

function fyllUtSkjema() {
  fireEvent.change(screen.getByLabelText("Tema"), { target: { value: "KTA" } });
  fireEvent.change(screen.getByLabelText("Oppgavetype"), { target: { value: "VURD_HENV" } });
  fireEvent.change(screen.getByLabelText("Prioritet"), { target: { value: "HOY" } });
  // Frist, behandlende enhet og gjelderverdi bruker useInputControl med skjulte felter
  for (const [navn, verdi] of [
    ["frist", "2026-06-01"],
    ["behandlendeEnhet", "4100"],
    ["gjelderverdi", "ab0356"],
  ]) {
    fireEvent.change(document.querySelector(`input[name="${navn}"]`) as HTMLInputElement, {
      target: { value: verdi },
    });
  }
  fireEvent.change(screen.getByLabelText("Beskrivelse"), { target: { value: "En beskrivelse" } });
}

describe("OpprettOppgaveModal", () => {
  beforeEach(() => {
    submitMock.mockClear();
    defaultProps.onClose.mockClear();
    kodeverkMock.tilstand = kodeverkOk;
    kodeverkMock.prøvIgjen.mockClear();
  });

  it("viser oppgaveskjemaet med alle felter", async () => {
    await renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    expect(screen.getByLabelText("Oppgavetype")).toBeDefined();
    expect(screen.getByLabelText("Prioritet")).toBeDefined();
    expect(screen.getByLabelText("Frist")).toBeDefined();
    expect(screen.getByLabelText("Behandlende enhet")).toBeDefined();
    expect(screen.getByLabelText("Gjelderverdi")).toBeDefined();
    expect(screen.getByLabelText("Beskrivelse")).toBeDefined();
    expect(screen.getByRole("radio", { name: "Orienteringsnotat" })).toBeDefined();
  });

  it("krever at oppgaven knyttes til en journalføring", async () => {
    await renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    fyllUtSkjema();
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(await screen.findByText("Velg journalførte dokumenter")).toBeDefined();
    expect(screen.queryByText("Du oppretter nå en oppgave:")).toBeNull();
  });

  it("kaller submit med valgt journalpost og gjelderverdi", async () => {
    await renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    fyllUtSkjema();
    fireEvent.click(screen.getByRole("radio", { name: "Orienteringsnotat" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});
    expect(screen.getByText("Du oppretter nå en oppgave:")).toBeDefined();
    expect(screen.getByText("Kontroll anmeldelse")).toBeDefined();
    expect(screen.getByText("Vurder henvendelse")).toBeDefined();
    expect(screen.getByText("Dagpenger")).toBeDefined();
    expect(screen.getByText("Orienteringsnotat")).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: "Opprett" })
        .compareDocumentPosition(screen.getByRole("button", { name: "Avbryt" })),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    fireEvent.click(screen.getByRole("button", { name: "Opprett" }));
    await waitFor(() => {});

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData.get("handling")).toBe("opprett_oppgave");
    expect(formData.get("tema")).toBe("KTA");
    expect(formData.get("oppgavetype")).toBe("VURD_HENV");
    expect(formData.get("prioritet")).toBe("HOY");
    expect(formData.get("beskrivelse")).toBe("En beskrivelse");
    expect(formData.get("journalpostId")).toBe("jp-1");
    expect(formData.get("gjelderverdi")).toBe("ab0356");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("henter kodeverket for temaet saksbehandleren velger", async () => {
    kodeverkMock.tilstand = { status: "uten-tema" };
    await renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    expect(kodeverkMock.tema).toBeUndefined();
    expect((screen.getByLabelText("Oppgavetype") as HTMLSelectElement).disabled).toBe(true);
    expect(screen.getAllByText("Velg tema først")).toHaveLength(2);

    fireEvent.input(screen.getByLabelText("Tema"), { target: { value: "KTA" } });
    await waitFor(() => expect(kodeverkMock.tema).toBe("KTA"));
  });

  it("lar saksbehandleren prøve igjen når kodeverket ikke kunne hentes", async () => {
    kodeverkMock.tilstand = { status: "feil" };
    await renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));

    expect(kodeverkMock.prøvIgjen).toHaveBeenCalledTimes(1);
  });

  it("ber om ny innlasting i stedet for å prøve igjen når sesjonen er utløpt", async () => {
    kodeverkMock.tilstand = { status: "utlogget" };
    await renderMedRouter(
      <OpprettOppgaveModal
        {...defaultProps}
        arkiv={{ ...arkiv, tilstand: { status: "feil", årsak: "utlogget" } }}
      />,
    );

    expect(
      screen.getAllByText("Sesjonen din er utløpt. Last inn siden på nytt for å logge inn."),
    ).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Prøv igjen" })).toBeNull();
  });

  it("henter journalføringene når de ikke er hentet", async () => {
    const hent = vi.fn();
    await renderMedRouter(
      <OpprettOppgaveModal
        {...defaultProps}
        arkiv={{ kanSeArkiv: true, hent, tilstand: { status: "ikke-hentet" } }}
      />,
    );

    expect(hent).toHaveBeenCalledTimes(1);
  });

  it("forklarer at saksbehandleren mangler tilgang til dokumentoversikten", async () => {
    await renderMedRouter(
      <OpprettOppgaveModal {...defaultProps} arkiv={{ ...arkiv, kanSeArkiv: false }} />,
    );

    expect(
      screen.getByText("Du har ikke tilgang til dokumentoversikten i Gosys for denne saken."),
    ).toBeDefined();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("lar saksbehandleren prøve igjen når journalføringene ikke kunne hentes", async () => {
    const hent = vi.fn();
    await renderMedRouter(
      <OpprettOppgaveModal
        {...defaultProps}
        arkiv={{ kanSeArkiv: true, hent, tilstand: { status: "feil", årsak: "utilgjengelig" } }}
      />,
    );

    expect(screen.getByText("Kunne ikke hente journalførte dokumenter fra Gosys.")).toBeDefined();
    hent.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));

    expect(hent).toHaveBeenCalledTimes(1);
  });

  it("viser ikke feilregistrerte, utgåtte eller avbrutte journalføringer", async () => {
    const [gyldig] = arkiv.tilstand.status === "ok" ? arkiv.tilstand.journalposter : [];
    const ugyldige = ["FEILREGISTRERT", "UTGAAR", "AVBRUTT"].map((journalstatus) => ({
      ...gyldig,
      journalpostId: `jp-${journalstatus}`,
      tittel: `Notat ${journalstatus}`,
      journalstatus,
    }));
    await renderMedRouter(
      <OpprettOppgaveModal
        {...defaultProps}
        arkiv={{ ...arkiv, tilstand: { status: "ok", journalposter: [gyldig, ...ugyldige] } }}
      />,
    );

    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("value"))).toEqual([
      "jp-1",
    ]);
  });

  it("ber om arkivering først når saken ikke har gyldige journalføringer", async () => {
    const [gyldig] = arkiv.tilstand.status === "ok" ? arkiv.tilstand.journalposter : [];
    await renderMedRouter(
      <OpprettOppgaveModal
        {...defaultProps}
        arkiv={{
          ...arkiv,
          tilstand: {
            status: "ok",
            journalposter: [{ ...gyldig, journalstatus: "FEILREGISTRERT" }],
          },
        }}
      />,
    );

    expect(
      screen.getByText(
        "Saken har ingen journalførte dokumenter i Gosys. Arkiver dokumenter før du oppretter en oppgave.",
      ),
    ).toBeDefined();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("kaller onClose ved avbryt", async () => {
    await renderMedRouter(<OpprettOppgaveModal {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => {});

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
