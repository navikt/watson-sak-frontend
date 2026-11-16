import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HenleggelsesnotatResultat } from "~/saker/types.backend";
import { SaksflytModal } from "./SaksflytModal";
import { lagTillatteHandlinger } from "./testdata";

const submitMock = vi.fn();
let svarPåHandling: (formData: FormData) => unknown;

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
      return {
        state: "idle",
        submit: (formData: FormData, opts: unknown) => {
          submitMock(formData, opts);
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

function renderModal() {
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
});
