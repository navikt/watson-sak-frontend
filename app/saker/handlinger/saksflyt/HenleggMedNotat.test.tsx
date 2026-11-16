import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpprettetJournalpost } from "~/saker/arkiv/typer";
import type { HenleggelsesnotatResultat, RegistrertHenleggelsesnotat } from "~/saker/types.backend";
import { SaksflytModal } from "./SaksflytModal";
import { lagTillatteHandlinger } from "./testdata";

const submitMock = vi.fn();
let svarPåHandling: (formData: FormData) => unknown;
/** Når satt, blir innsendingen stående som pågående. */
let holdSvar = false;

vi.mock("../useOppgavekodeverk", () => ({
  useOppgavekodeverk: () => ({
    prøvIgjen: vi.fn(),
    tilstand: {
      status: "ok",
      kodeverk: {
        oppgavetyper: [{ oppgavetype: "VURD_HENV", term: "Vurder henvendelse" }],
        gjelderverdier: [{ behandlingstema: "ab0356", behandlingstemaTerm: "Annet" }],
      },
    },
  }),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  const react = await import("react");
  return {
    ...actual,
    useFetcher: () => {
      const [data, setData] = react.useState<unknown>(undefined);
      const [sender, setSender] = react.useState(false);
      return {
        state: sender ? "submitting" : "idle",
        submit: (formData: FormData, opts: unknown) => {
          submitMock(formData, opts);
          if (holdSvar) {
            setSender(true);
            return;
          }
          setData(svarPåHandling(formData));
        },
        data,
        Form: "form",
      };
    },
  };
});

function svar(...notater: HenleggelsesnotatResultat[]) {
  return { ok: true, notater };
}

const journalført = (
  notattype: HenleggelsesnotatResultat["notattype"],
  journalpostId = "jp-1",
): HenleggelsesnotatResultat => ({ notattype, utfall: "JOURNALFORT", journalpostId });

/** Svarer som backend: notatene settes i hver sin utfallstype, alt annet er ok. */
function svarMed(
  lagResultat: (notattype: string, tekst: string | null) => HenleggelsesnotatResultat,
) {
  svarPåHandling = (formData) => {
    if (formData.get("handling") !== "registrer_henleggelsesnotater") return { ok: true };
    const notater = JSON.parse(String(formData.get("notater"))) as {
      notattype: string;
      tekst: string | null;
    }[];
    return svar(...notater.map((notat) => lagResultat(notat.notattype, notat.tekst)));
  };
}

function renderModal(
  registrerteNotater: RegistrertHenleggelsesnotat[] = [],
  onNotatJournalført: (journalpost: OpprettetJournalpost) => void = () => {},
) {
  const onClose = vi.fn();
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <SaksflytModal
            sakId="101"
            tillatteHandlinger={lagTillatteHandlinger({ steg: "UTREDNING" })}
            start="meny"
            registrerteNotater={registrerteNotater}
            onNotatJournalført={onNotatJournalført}
            onClose={onClose}
          />
        ),
      },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  return { onClose };
}

function klikk(navn: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: navn }));
}

async function åpneHenleggelse() {
  klikk("Henlegg sak");
  await screen.findByRole("dialog", { name: "Henlegg sak" });
  fireEvent.click(screen.getByRole("radio", { name: "Ikke kapasitet" }));
  klikk("Vis mer");
}

function skriv(notat: "henleggelsesnotat" | "orienteringsnotat", tekst: string) {
  const etikett = new RegExp(`Skriv notat.*${notat}`, "i");
  klikk(etikett);
  fireEvent.change(screen.getByRole("textbox", { name: new RegExp(`Tekst i ${notat}`, "i") }), {
    target: { value: tekst },
  });
}

function innsendinger(handling: string): FormData[] {
  return submitMock.mock.calls
    .map(([formData]) => formData as FormData)
    .filter((formData) => formData.get("handling") === handling);
}

describe("henlegg utredning med notat", () => {
  beforeEach(() => {
    submitMock.mockClear();
    svarPåHandling = () => ({ ok: true });
    holdSvar = false;
  });
  afterEach(cleanup);

  it("krysser av notattypen automatisk når saksbehandler skriver tekst", async () => {
    renderModal();
    await åpneHenleggelse();
    const avkrysning = screen.getByRole("checkbox", { name: "Orienteringsnotat" });
    expect((avkrysning as HTMLInputElement).checked).toBe(false);

    skriv("orienteringsnotat", "Se vedlagt vurdering");

    expect((avkrysning as HTMLInputElement).checked).toBe(true);
    expect(
      (screen.getByRole("checkbox", { name: "Henleggelsesnotat" }) as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("går rett til bekreftelsen uten notat og avslutter med årsak", async () => {
    renderModal();
    klikk("Henlegg sak");
    await screen.findByRole("dialog", { name: "Henlegg sak" });
    klikk("Avslutt sak");
    expect(screen.getByText("Velg henleggelsesårsak")).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: "Ikke kapasitet" }));
    klikk("Avslutt sak");

    expect(await screen.findByRole("dialog", { name: "Avslutt sak" })).toBeDefined();
    expect(screen.getByText("Tilgang til dokumenter og underlag")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Knytt til oppgave" })).toBeNull();
    expect(innsendinger("registrer_henleggelsesnotater")).toHaveLength(0);

    klikk("Avslutt sak");
    const [avslutning] = innsendinger("endre_steg_dialog");
    expect(Object.fromEntries(avslutning)).toMatchObject({
      steg: "AVSLUTTET",
      "resultat.utredning.type": "HENLAGT",
      "resultat.utredning.henleggelsesarsak": "IKKE_KAPASITET",
    });
  });

  it("viser kvittering for henleggelsesnotat med tekst og sender teksten", async () => {
    svarMed((notattype) => journalført(notattype as "HENLEGGELSESNOTAT"));
    renderModal();
    await åpneHenleggelse();
    skriv("henleggelsesnotat", "Ikke grunnlag for videre arbeid");
    klikk("Avslutt sak");

    expect(
      await screen.findByText("Henleggelsesnotatet er arkivert og journalført i Gosys"),
    ).toBeDefined();
    expect(screen.queryByRole("button", { name: "Knytt til oppgave" })).toBeNull();
    const [registrering] = innsendinger("registrer_henleggelsesnotater");
    expect(JSON.parse(String(registrering.get("notater")))).toEqual([
      { notattype: "HENLEGGELSESNOTAT", tekst: "Ikke grunnlag for videre arbeid" },
    ]);
    expect(innsendinger("endre_steg_dialog")).toHaveLength(0);
  });

  it("gir «Knytt til oppgave» når orienteringsnotatet er journalført", async () => {
    svarMed((notattype) => journalført(notattype as "ORIENTERINGSNOTAT", "jp-77"));
    renderModal();
    await åpneHenleggelse();
    skriv("orienteringsnotat", "Orientering");
    klikk("Avslutt sak");

    expect(
      await screen.findByText("Orienteringsnotat er arkivert og journalført i Gosys"),
    ).toBeDefined();
    expect(screen.getByText("Du kan knytte en oppgave til orienteringsnotatet.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Knytt til oppgave" })).toBeDefined();
  });

  it("gir ikke «Knytt til oppgave» når orienteringsnotatet er registrert uten tekst", async () => {
    svarMed((notattype) => ({
      notattype: notattype as "ORIENTERINGSNOTAT",
      utfall: "REGISTRERT_UTEN_TEKST",
      journalpostId: null,
    }));
    renderModal();
    await åpneHenleggelse();
    fireEvent.click(screen.getByRole("checkbox", { name: "Orienteringsnotat" }));
    klikk("Avslutt sak");

    await screen.findByRole("dialog", { name: "Avslutt sak" });
    expect(screen.queryByRole("button", { name: "Knytt til oppgave" })).toBeNull();
    expect(screen.queryByText(/arkivert og journalført/)).toBeNull();
    const [registrering] = innsendinger("registrer_henleggelsesnotater");
    expect(JSON.parse(String(registrering.get("notater")))).toEqual([
      { notattype: "ORIENTERINGSNOTAT", tekst: null },
    ]);
  });

  it("blir stående med teksten bevart når arkiveringen feiler, og sender på nytt", async () => {
    svarMed((notattype) => ({
      notattype: notattype as "HENLEGGELSESNOTAT",
      utfall: "FEILET",
      journalpostId: null,
    }));
    renderModal();
    await åpneHenleggelse();
    skriv("henleggelsesnotat", "Teksten må ikke gå tapt");
    klikk("Avslutt sak");

    const felt = await screen.findByRole("textbox", { name: /Tekst i henleggelsesnotat/i });
    expect(screen.getByText("Henleggelsesnotatet kunne ikke arkiveres. Prøv igjen.")).toBeDefined();
    expect((felt as HTMLTextAreaElement).value).toBe("Teksten må ikke gå tapt");
    expect(felt.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("dialog", { name: "Henlegg sak" })).toBeDefined();
    await waitFor(() => expect(document.activeElement).toBe(felt));

    svarMed((notattype) => journalført(notattype as "HENLEGGELSESNOTAT"));
    klikk("Avslutt sak");
    expect(
      await screen.findByText("Henleggelsesnotatet er arkivert og journalført i Gosys"),
    ).toBeDefined();
    expect(innsendinger("registrer_henleggelsesnotater")).toHaveLength(2);
  });

  it("viser at saken er åpen når saksbehandler avbryter etter at notat er arkivert", async () => {
    svarMed((notattype) => journalført(notattype as "HENLEGGELSESNOTAT"));
    const { onClose } = renderModal();
    await åpneHenleggelse();
    skriv("henleggelsesnotat", "Tekst");
    klikk("Avslutt sak");
    await screen.findByText("Henleggelsesnotatet er arkivert og journalført i Gosys");

    klikk("Avbryt");
    expect(screen.getByText("Notatet er arkivert. Saken er fortsatt åpen.")).toBeDefined();
    fireEvent.click(screen.getAllByRole("button", { name: "Lukk" }).at(-1) as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it("viser at saken er åpen når X eller Esc brukes etter journalføring", async () => {
    svarMed((notattype) => journalført(notattype as "HENLEGGELSESNOTAT"));
    const { onClose } = renderModal();
    await åpneHenleggelse();
    skriv("henleggelsesnotat", "Tekst");
    klikk("Avslutt sak");
    await screen.findByText("Henleggelsesnotatet er arkivert og journalført i Gosys");

    fireEvent.click(screen.getAllByRole("button", { name: "Lukk" })[0]);
    expect(await screen.findByText("Notatet er arkivert. Saken er fortsatt åpen.")).toBeDefined();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("lukker direkte med X før noe er journalført", async () => {
    const { onClose } = renderModal();
    await åpneHenleggelse();
    fireEvent.click(screen.getAllByRole("button", { name: "Lukk" })[0]);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  async function tilOppgaveskjema() {
    svarMed((notattype) => journalført(notattype as "ORIENTERINGSNOTAT", "jp-77"));
    renderModal();
    await åpneHenleggelse();
    skriv("orienteringsnotat", "Orientering");
    klikk("Avslutt sak");
    await screen.findByText("Orienteringsnotat er arkivert og journalført i Gosys");
    klikk("Knytt til oppgave");
    await screen.findByRole("dialog", { name: "Knytt oppgave til orienteringsnotat" });
  }

  function fyllOppgaveskjema() {
    const settSkjult = (navn: string, verdi: string) =>
      fireEvent.change(document.querySelector(`input[name="${navn}"]`) as HTMLInputElement, {
        target: { value: verdi },
      });
    fireEvent.change(screen.getByLabelText("Oppgavetype"), { target: { value: "VURD_HENV" } });
    fireEvent.change(screen.getByLabelText("Prioritet"), { target: { value: "HOY" } });
    settSkjult("frist", "2026-12-01");
    settSkjult("behandlendeEnhet", "4100");
    settSkjult("gjelderverdi", "ab0356");
    fireEvent.change(screen.getByLabelText("Beskrivelse"), { target: { value: "Følg opp" } });
  }

  it("avslutter ikke saken når oppgaven ikke kan opprettes", async () => {
    await tilOppgaveskjema();
    svarPåHandling = () => ({ ok: false, feil: "Gosys svarte ikke" });
    fyllOppgaveskjema();
    klikk("Arkiver oppgave og avslutt sak");

    expect(await screen.findByText(/Kunne ikke opprette oppgave/)).toBeDefined();
    expect(
      screen.getByRole("dialog", { name: "Knytt oppgave til orienteringsnotat" }),
    ).toBeDefined();
    const [oppgave] = innsendinger("opprett_oppgave");
    expect(oppgave.get("journalpostId")).toBe("jp-77");
    expect(oppgave.get("tema")).toBe("KTR");
    expect(innsendinger("endre_steg_dialog")).toHaveLength(0);
  });

  it("går videre til avslutning først når oppgaven er opprettet", async () => {
    await tilOppgaveskjema();
    svarPåHandling = () => ({ ok: true });
    fyllOppgaveskjema();
    klikk("Arkiver oppgave og avslutt sak");

    expect(
      await screen.findByText("Oppgaven er opprettet og knyttet til orienteringsnotatet."),
    ).toBeDefined();
    expect(screen.getByText("Tilgang til dokumenter og underlag")).toBeDefined();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Knytt til oppgave" })).toBeNull();
    expect(innsendinger("endre_steg_dialog")).toHaveLength(0);
    klikk("Avslutt sak");
    expect(innsendinger("endre_steg_dialog")).toHaveLength(1);
  });

  it("går tilbake til kvitteringen fra oppgaveskjemaet", async () => {
    await tilOppgaveskjema();
    klikk("Avbryt");
    expect(await screen.findByRole("button", { name: "Knytt til oppgave" })).toBeDefined();
  });

  const registrert = (
    notattype: RegistrertHenleggelsesnotat["notattype"],
    journalpostId: string | null,
  ): RegistrertHenleggelsesnotat => ({
    notattype,
    journalpostId,
    registrertTidspunkt: "2026-11-16T10:00:00Z",
  });

  it("viser journalførte notater fra loaderen som avkrysset og låst, og bruker journalpostId", async () => {
    renderModal([registrert("ORIENTERINGSNOTAT", "jp-9")]);
    await åpneHenleggelse();

    const avkrysning = screen.getByRole("checkbox", {
      name: "Orienteringsnotat",
    }) as HTMLInputElement;
    expect(avkrysning.checked).toBe(true);
    expect(avkrysning.disabled).toBe(true);
    expect(screen.getByText("Arkivert i Gosys")).toBeDefined();
    expect(screen.queryByRole("button", { name: /Skriv notat.*orienteringsnotat/i })).toBeNull();
    expect(screen.getByRole("button", { name: /Skriv notat.*henleggelsesnotat/i })).toBeDefined();

    klikk("Avslutt sak");
    expect(
      await screen.findByText("Orienteringsnotat er arkivert og journalført i Gosys"),
    ).toBeDefined();
    expect(innsendinger("registrer_henleggelsesnotater")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "Knytt til oppgave" })).toBeDefined();
  });

  it("lar notater uten journalpost få tekst", async () => {
    renderModal([registrert("ORIENTERINGSNOTAT", null)]);
    await åpneHenleggelse();
    const avkrysning = screen.getByRole("checkbox", {
      name: "Orienteringsnotat",
    }) as HTMLInputElement;
    expect(avkrysning.disabled).toBe(false);
    expect(screen.getByRole("button", { name: /Skriv notat.*orienteringsnotat/i })).toBeDefined();
  });

  it("låser journalført notat ved delvis suksess og sender bare det som gjenstår", async () => {
    svarMed((notattype) =>
      notattype === "HENLEGGELSESNOTAT"
        ? journalført("HENLEGGELSESNOTAT", "jp-1")
        : { notattype: "ORIENTERINGSNOTAT", utfall: "FEILET", journalpostId: null },
    );
    renderModal();
    await åpneHenleggelse();
    skriv("henleggelsesnotat", "A");
    skriv("orienteringsnotat", "B");
    klikk("Avslutt sak");
    await screen.findByText("Orienteringsnotatet kunne ikke arkiveres. Prøv igjen.");

    expect(
      (screen.getByRole("checkbox", { name: "Henleggelsesnotat" }) as HTMLInputElement).disabled,
    ).toBe(true);

    svarMed((notattype) => journalført(notattype as "ORIENTERINGSNOTAT", "jp-2"));
    klikk("Avslutt sak");
    expect(
      await screen.findByText(
        "Henleggelsesnotatet og orienteringsnotatet er arkivert og journalført i Gosys",
      ),
    ).toBeDefined();
    const registreringer = innsendinger("registrer_henleggelsesnotater");
    expect(JSON.parse(String(registreringer[1].get("notater")))).toEqual([
      { notattype: "ORIENTERINGSNOTAT", tekst: "B" },
    ]);
    expect(screen.getByRole("button", { name: "Knytt til oppgave" })).toBeDefined();
  });

  it("beholder «Knytt til oppgave» når orienteringsnotatet lyktes og henleggelsesnotatet feilet", async () => {
    svarMed((notattype) =>
      notattype === "ORIENTERINGSNOTAT"
        ? journalført("ORIENTERINGSNOTAT", "jp-3")
        : { notattype: "HENLEGGELSESNOTAT", utfall: "FEILET", journalpostId: null },
    );
    renderModal();
    await åpneHenleggelse();
    skriv("henleggelsesnotat", "A");
    skriv("orienteringsnotat", "B");
    klikk("Avslutt sak");
    await screen.findByText("Henleggelsesnotatet kunne ikke arkiveres. Prøv igjen.");

    // Retur med bare henleggelsesnotatet i svaret skal ikke fjerne orienteringsnotatets journalpost.
    svarMed((notattype) => journalført(notattype as "HENLEGGELSESNOTAT", "jp-4"));
    klikk("Avslutt sak");
    await screen.findByText(/er arkivert og journalført i Gosys/);
    fireEvent.click(screen.getByRole("button", { name: "Knytt til oppgave" }));
    await screen.findByRole("dialog", { name: "Knytt oppgave til orienteringsnotat" });
    fyllOppgaveskjema();
    klikk("Arkiver oppgave og avslutt sak");
    await waitFor(() => expect(innsendinger("opprett_oppgave")).toHaveLength(1));
    expect(innsendinger("opprett_oppgave")[0].get("journalpostId")).toBe("jp-3");
  });

  it("lukker ikke og bytter ikke trinn med X mens oppgaven opprettes", async () => {
    await tilOppgaveskjema();
    holdSvar = true;
    fyllOppgaveskjema();
    klikk("Arkiver oppgave og avslutt sak");
    await waitFor(() => expect(innsendinger("opprett_oppgave")).toHaveLength(1));

    fireEvent.click(screen.getAllByRole("button", { name: "Lukk" })[0]);
    expect(
      screen.getByRole("dialog", { name: "Knytt oppgave til orienteringsnotat" }),
    ).toBeDefined();
    expect(screen.queryByText("Notatet er arkivert. Saken er fortsatt åpen.")).toBeNull();
  });

  it("sier at utfallet er ukjent ved teknisk feil, med feil-ID", async () => {
    await tilOppgaveskjema();
    svarPåHandling = () => ({
      ok: false,
      feil: "intern",
      feilId: "feil-42",
      teknisk: true,
      usikker: true,
    });
    fyllOppgaveskjema();
    klikk("Arkiver oppgave og avslutt sak");

    expect(
      await screen.findByText(
        "Vi vet ikke om oppgaven ble opprettet. Sjekk Gosys før du prøver igjen. Feil-ID: feil-42",
      ),
    ).toBeDefined();
    expect(innsendinger("endre_steg_dialog")).toHaveLength(0);
  });

  it("beholder dagens melding ved tydelig avvist oppgave", async () => {
    await tilOppgaveskjema();
    svarPåHandling = () => ({
      ok: false,
      feil: "x",
      feilId: "feil-43",
      teknisk: true,
      usikker: false,
    });
    fyllOppgaveskjema();
    klikk("Arkiver oppgave og avslutt sak");
    expect(await screen.findByText(/Kunne ikke opprette oppgave/)).toBeDefined();
  });

  it("varsler Gosys-oversikten om journalførte notater, også når det andre feilet", async () => {
    const varsel = vi.fn();
    svarMed((notattype) =>
      notattype === "ORIENTERINGSNOTAT"
        ? journalført("ORIENTERINGSNOTAT", "jp-5")
        : { notattype: "HENLEGGELSESNOTAT", utfall: "FEILET", journalpostId: null },
    );
    renderModal([], varsel);
    await åpneHenleggelse();
    skriv("henleggelsesnotat", "A");
    skriv("orienteringsnotat", "B");
    klikk("Avslutt sak");
    await screen.findByText("Henleggelsesnotatet kunne ikke arkiveres. Prøv igjen.");

    expect(varsel).toHaveBeenCalledTimes(1);
    expect(varsel).toHaveBeenCalledWith({
      journalpostId: "jp-5",
      journalposttype: "NOTAT",
      tittel: "Orienteringsnotat",
      dokumenttitler: ["Orienteringsnotat"],
    });
  });

  it("varsler ikke Gosys-oversikten når ingenting er journalført", async () => {
    const varsel = vi.fn();
    svarMed((notattype) => ({
      notattype: notattype as "HENLEGGELSESNOTAT",
      utfall: "REGISTRERT_UTEN_TEKST",
      journalpostId: null,
    }));
    renderModal([], varsel);
    await åpneHenleggelse();
    fireEvent.click(screen.getByRole("checkbox", { name: "Henleggelsesnotat" }));
    klikk("Avslutt sak");
    await screen.findByRole("dialog", { name: "Avslutt sak" });
    expect(varsel).not.toHaveBeenCalled();
  });
});
