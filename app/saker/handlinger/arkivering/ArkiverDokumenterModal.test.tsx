import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DokumentNode, FilResponse } from "~/saker/filer/typer";
import { ArkiverDokumenterModal } from "./ArkiverDokumenterModal";

const submitMock = vi.fn();
const sporHendelseMock = vi.fn();

vi.mock("~/analytics/analytics", () => ({
  sporHendelse: (...args: unknown[]) => sporHendelseMock(...args),
}));
const fetcher: { state: string; data: unknown } = { state: "idle", data: undefined };

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useFetcher: () => ({ ...fetcher, submit: submitMock, Form: "form" }),
  };
});

function fil(id: string, filnavn: string, overstyr: Partial<FilResponse> = {}): FilResponse {
  return {
    id,
    filnavn,
    storrelse: 100,
    contentType: "application/pdf",
    opprettetAv: "Z123456",
    opprettet: "2026-01-01T10:00:00Z",
    bruktIDokumenter: [],
    ...overstyr,
  };
}

const notat: DokumentNode = {
  id: "dok-1",
  tittel: "Vurderingsnotat",
  opprettetAv: "Z123456",
  opprettetDato: "2026-01-01",
  endretAv: "Z123456",
  endretDato: "2026-01-01",
  låsAv: null,
};

const onClose = vi.fn();
const onOpprettet = vi.fn();
const onKnyttTilOppgave = vi.fn();

async function renderModal(filer: FilResponse[], dokumenter: DokumentNode[] = []) {
  const lagModal = () => (
    <ArkiverDokumenterModal
      sakId="00000000-0000-4000-8000-000000000001"
      åpen
      onClose={onClose}
      onOpprettet={onOpprettet}
      onKnyttTilOppgave={onKnyttTilOppgave}
      filer={filer}
      dokumenter={dokumenter}
    />
  );
  const resultat = render(lagModal());
  await waitFor(() => {});
  return { ...resultat, rerenderModal: () => resultat.rerender(lagModal()) };
}

function fyllUtSkjema(dokumentbeskrivelse = "Kontrollnotat") {
  fireEvent.change(screen.getByLabelText("Tema"), { target: { value: "KTA" } });
  // Nettleseren sender både input og change når et valg endres. Conform lytter på input.
  fireEvent.input(screen.getByLabelText("Dokumentbeskrivelse"), {
    target: { value: dokumentbeskrivelse },
  });
}

describe("ArkiverDokumenterModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetcher.state = "idle";
    fetcher.data = undefined;
  });

  it("har Anmeldelse som eget valg for dokumentbeskrivelse", async () => {
    await renderModal([fil("fil-1", "anmeldelse.pdf")]);

    const valg = within(screen.getByLabelText("Dokumentbeskrivelse")).getByRole("option", {
      name: "Anmeldelse",
    });
    expect(valg).toBeDefined();
  });

  it("krever tema, dokumentbeskrivelse og minst én fil eller ett dokument", async () => {
    await renderModal([fil("fil-1", "rapport.pdf")]);

    fireEvent.click(screen.getByRole("button", { name: "Arkiver" }));

    // Teksten finnes både som tomt valg i nedtrekkslisten og som feilmelding.
    await waitFor(() => expect(screen.getAllByText("Velg tema")).toHaveLength(2));
    expect(screen.getAllByText("Velg dokumentbeskrivelse")).toHaveLength(2);
    expect(screen.getByText("Velg minst én fil eller ett dokument")).toBeDefined();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("viser temaene uten intern kode", async () => {
    await renderModal([fil("fil-1", "rapport.pdf")]);

    const tema = within(screen.getByLabelText("Tema"));
    expect(tema.getAllByRole("option").map((valg) => valg.textContent)).toEqual([
      "Velg tema",
      "Kontroll",
      "Kontroll anmeldelse",
    ]);
  });

  it("flytter fokus til utvalget og fjerner feilen når noe velges", async () => {
    await renderModal([fil("fil-1", "rapport.pdf", { mappe: "Bank" })]);

    fyllUtSkjema();
    fireEvent.click(screen.getByRole("button", { name: "Arkiver" }));

    expect(await screen.findByText("Velg minst én fil eller ett dokument")).toBeDefined();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("checkbox", { name: "Bank" })),
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Bank" }));

    await waitFor(() =>
      expect(screen.queryByText("Velg minst én fil eller ett dokument")).toBeNull(),
    );
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("gir mapper med lignende navn hver sin innholds-ID", async () => {
    await renderModal([
      fil("fil-1", "a.pdf", { mappe: "Bank/2026" }),
      fil("fil-2", "b.pdf", { mappe: "Bank 2026" }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Vis innhold i Bank" }));
    fireEvent.click(screen.getByRole("button", { name: "Vis innhold i 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Vis innhold i Bank 2026" }));

    const ider = screen
      .getAllByRole("button", { name: /^Skjul innhold i / })
      .map((knapp) => knapp.getAttribute("aria-controls"));
    expect(new Set(ider).size).toBe(3);
    for (const id of ider) expect(document.getElementById(id ?? "")).not.toBeNull();
  });

  it("sender selvvalgt dokumentbeskrivelse som tittel når «Annet» er valgt", async () => {
    await renderModal([fil("fil-1", "rapport.pdf")], [notat]);

    fyllUtSkjema("Annet");
    fireEvent.change(screen.getByLabelText("Selvvalgt dokumentbeskrivelse"), {
      target: { value: "Egen beskrivelse" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "rapport.pdf" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Vurderingsnotat" }));
    fireEvent.click(screen.getByRole("button", { name: "Arkiver" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    const [formData] = submitMock.mock.calls[0];
    expect(formData.get("handling")).toBe("opprett_journalpost");
    expect(formData.get("tema")).toBe("KTA");
    expect(formData.get("tittel")).toBe("Egen beskrivelse");
    expect(formData.getAll("vedleggId")).toEqual(["fil-1"]);
    expect(formData.getAll("dokumentId")).toEqual(["dok-1"]);
    expect(formData.has("dokumentbeskrivelse")).toBe(false);
    expect(formData.has("valgt")).toBe(false);
  });

  it("velger alt innhold i en mappe når mappen krysses av", async () => {
    await renderModal([
      fil("fil-1", "a.pdf", { mappe: "Bank" }),
      fil("fil-2", "b.pdf", { mappe: "Bank/Kontoutskrifter" }),
      fil("fil-3", "c.pdf"),
    ]);

    fyllUtSkjema();
    fireEvent.click(screen.getByRole("checkbox", { name: "Bank" }));
    fireEvent.click(screen.getByRole("button", { name: "Arkiver" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    expect(submitMock.mock.calls[0][0].getAll("vedleggId").sort()).toEqual(["fil-1", "fil-2"]);
  });

  it("viser feilmeldingen fra backend når en Word-fil ikke kan gjøres om til PDF", async () => {
    const { rerenderModal } = await renderModal([fil("fil-1", "rapport.pdf")]);

    fyllUtSkjema();
    fireEvent.click(screen.getByRole("checkbox", { name: "rapport.pdf" }));
    fireEvent.click(screen.getByRole("button", { name: "Arkiver" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    fetcher.state = "submitting";
    act(rerenderModal);
    fetcher.state = "idle";
    fetcher.data = { ok: false, feil: "Word-filen kunne ikke gjøres om til PDF." };
    act(rerenderModal);

    expect(await screen.findByText("Word-filen kunne ikke gjøres om til PDF.")).toBeDefined();
  });

  it("viser suksess og lar saksbehandleren knytte en oppgave til journalposten", async () => {
    const { rerenderModal } = await renderModal([fil("fil-1", "rapport.pdf")]);

    fyllUtSkjema();
    fireEvent.click(screen.getByRole("checkbox", { name: "rapport.pdf" }));
    fireEvent.click(screen.getByRole("button", { name: "Arkiver" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledTimes(1));

    fetcher.state = "submitting";
    act(rerenderModal);
    fetcher.state = "idle";
    fetcher.data = { ok: true, journalpostId: "jp-1" };
    act(rerenderModal);

    expect(await screen.findByText("Dokumentet er arkivert og journalført i Gosys")).toBeDefined();
    expect(
      screen.getByText("Du kan knytte en oppgave til det journalførte dokumentet."),
    ).toBeDefined();
    expect(onOpprettet).toHaveBeenCalledWith(
      expect.objectContaining({ journalposttype: "NOTAT", journalpostId: "jp-1" }),
    );
    expect(sporHendelseMock).toHaveBeenCalledWith("journalpost opprettet", {
      antallFiler: 1,
      antallDokumenter: 0,
      dokumentbeskrivelse: "Kontrollnotat",
    });

    fireEvent.click(screen.getByRole("button", { name: "Knytt til oppgave" }));

    expect(onKnyttTilOppgave).toHaveBeenCalledWith({
      journalpostId: "jp-1",
      tema: "KTA",
      dokumentbeskrivelse: "Kontrollnotat",
      dokumentnavn: ["rapport.pdf"],
    });
  });
});
