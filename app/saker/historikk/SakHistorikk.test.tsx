import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SakHendelse } from "./typer";
import { SakHistorikk } from "./SakHistorikk";

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Saks Behandlersen",
    preferredUsername: "test",
    enhet: "4812",
  }),
}));

vi.mock("@navikt/ds-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@navikt/ds-react")>();

  return {
    ...actual,
    Textarea: ({
      label,
      error: _error,
      description: _description,
      hideLabel: _hideLabel,
      resize: _resize,
      ...props
    }: React.ComponentPropsWithoutRef<"textarea"> & {
      label?: React.ReactNode;
      error?: React.ReactNode;
      description?: React.ReactNode;
      hideLabel?: boolean;
      resize?: boolean;
    }) => (
      <label>
        {label}
        <textarea {...props} />
      </label>
    ),
  };
});

function lagBackendHendelse(overrides: Partial<SakHendelse> = {}): SakHendelse {
  return {
    hendelseId: "00000000-0000-4000-8000-000000000123",
    tidspunkt: "2026-03-31T10:15:00Z",
    hendelsesType: "SAK_OPPRETTET",
    sakId: 1,
    kategori: "ARBEID",
    prioritet: "NORMAL",
    status: "OPPRETTET",
    ytelseTyper: ["SYKEPENGER"],
    ...overrides,
  };
}

async function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });
  const resultat = render(<RouterProvider router={router} />);
  await waitFor(() => {});
  return resultat;
}

describe("SakHistorikk", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renderer backend hendelsestype og statusfelt", async () => {
    await renderMedRouter(
      <SakHistorikk redigerbar={true} sakId={1} hendelser={[lagBackendHendelse()]} />,
    );

    expect(screen.getByText("Sak opprettet")).toBeDefined();
    expect(screen.getByText(/Status: Opprettet/)).toBeDefined();
  });

  it("viser historikktidspunkt i norsk tidssone", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[lagBackendHendelse({ tidspunkt: "2026-01-01T10:00:00Z" })]}
      />,
    );

    expect(screen.getByText(/11:00/)).toBeDefined();
  });

  it("renderer avklaringshendelse med oppdatert status", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "AVKLARING_OPPRETTET",
            status: "AVSLUTTET",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Avklaring opprettet")).toBeDefined();
    expect(screen.getByText(/Status: Avsluttet/)).toBeDefined();
  });

  it("renderer beskrivelse for statusendring", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "STATUS_ENDRET",
            status: "ANMELDT",
            beskrivelse: "Saken er vurdert og anmeldt",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak anmeldt")).toBeDefined();
    expect(screen.getByText(/Saken er vurdert og anmeldt – Status: Anmeldt/)).toBeDefined();
  });

  it("renderer historikk for endret ansvarlig saksbehandler", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "ANSVARLIG_SAKSBEHANDLER_ENDRET",
            berortSaksbehandlerNavn: "Kari Nordmann",
            berortSaksbehandlerNavIdent: "Z123456",
            berortSaksbehandlerEnhet: "Seksjon A",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Ansvarlig saksbehandler endret")).toBeDefined();
    expect(
      screen.getByText(/Ansvarlig saksbehandler: Kari Nordmann \(Z123456\) · Seksjon A/),
    ).toBeDefined();
  });

  it("renderer historikk for fjernet deling", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "TILGANG_FJERNET",
            berortSaksbehandlerNavn: "Ada Larsen",
            berortSaksbehandlerNavIdent: "Z234567",
            berortSaksbehandlerEnhet: "Seksjon B",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Tilgang fjernet")).toBeDefined();
    expect(
      screen.getByText(/Fjernet deling med: Ada Larsen \(Z234567\) · Seksjon B/),
    ).toBeDefined();
  });

  it("renderer sak satt på vent med blokkeringsårsak og status", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "SAK_SATT_PA_VENT",
            status: "UTREDES",
            blokkert: "VENTER_PA_VEDTAK",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak satt på vent")).toBeDefined();
    expect(screen.getByText(/På vent: Venter på vedtak – Status: Utredes/)).toBeDefined();
  });

  it("renderer gjenoppta som vanlig gjenopptak for ventesaker", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "SAK_GJENOPPTATT",
            blokkert: "VENTER_PA_VEDTAK",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak gjenopptatt")).toBeDefined();
  });

  it("renderer gjenoppta som tatt ut av bero for bero-saker", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "SAK_GJENOPPTATT",
            blokkert: "I_BERO",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak tatt ut av bero")).toBeDefined();
  });

  it("viser statusendring for SAK_STATUS_ENDRET fra backend", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000002",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "UTREDES",
            tidspunkt: "2026-03-31T11:00:00Z",
          }),
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000001",
            hendelsesType: "SAK_OPPRETTET",
            status: "OPPRETTET",
            tidspunkt: "2026-03-31T10:00:00Z",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak utredes")).toBeDefined();
    expect(screen.getByText(/Status: Utredes/)).toBeDefined();
  });

  it("viser arbeidsstatusendring for SAK_STATUS_ENDRET når kun blokkering endres", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000002",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "UTREDES",
            blokkert: "I_BERO",
            tidspunkt: "2026-03-31T11:00:00Z",
          }),
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000001",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "UTREDES",
            blokkert: null,
            tidspunkt: "2026-03-31T10:00:00Z",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak satt i bero")).toBeDefined();
    expect(screen.getByText(/Arbeidsstatus: I bero – Status: Utredes/)).toBeDefined();
  });

  it("viser gjenopptak for SAK_STATUS_ENDRET når blokkering fjernes", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000002",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "UTREDES",
            blokkert: null,
            tidspunkt: "2026-03-31T11:00:00Z",
          }),
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000001",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "UTREDES",
            blokkert: "VENTER_PA_VEDTAK",
            tidspunkt: "2026-03-31T10:00:00Z",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak gjenopptatt")).toBeDefined();
    expect(screen.getByText(/Arbeidsstatus: Aktiv – Status: Utredes/)).toBeDefined();
  });

  it("viser både status- og arbeidsstatusendring når begge endres samtidig for SAK_STATUS_ENDRET", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000002",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "AVSLUTTET",
            blokkert: null,
            tidspunkt: "2026-03-31T11:00:00Z",
          }),
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000001",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "UTREDES",
            blokkert: "I_BERO",
            tidspunkt: "2026-03-31T10:00:00Z",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak avsluttet og tatt ut av bero")).toBeDefined();
    expect(screen.getByText(/Arbeidsstatus: Aktiv – Status: Avsluttet/)).toBeDefined();
  });

  it("viser henleggelsesårsak for SAK_STATUS_ENDRET når status blir HENLAGT", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000002",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "HENLAGT",
            henleggelsesarsak: "FORELDET",
            tidspunkt: "2026-03-31T11:00:00Z",
          }),
          lagBackendHendelse({
            hendelseId: "00000000-0000-4000-8000-000000000001",
            hendelsesType: "SAK_STATUS_ENDRET",
            status: "UTREDES",
            tidspunkt: "2026-03-31T10:00:00Z",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Sak henlagt")).toBeDefined();
    expect(screen.getByText(/Årsak: Foreldet/)).toBeDefined();
  });

  it("renderer fritekst for manuelt historikkinnslag", async () => {
    await renderMedRouter(
      <SakHistorikk
        redigerbar={true}
        sakId={1}
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "MANUELL_HENDELSE",
            tittel: "Ringte bruker",
            beskrivelse: "Avklarte dokumentasjon og neste steg.",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Ringte bruker")).toBeDefined();
    expect(screen.getByText("Avklarte dokumentasjon og neste steg.")).toBeDefined();
  });

  it("setter tidspunkt for nytt historikkinnslag når modalen åpnes", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-06T08:15:00"));

    await renderMedRouter(
      <SakHistorikk redigerbar={true} sakId={1} hendelser={[lagBackendHendelse()]} />,
    );

    vi.setSystemTime(new Date("2026-05-06T09:42:00"));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Legg til" }));
    });
    await waitFor(() => {});

    expect((screen.getByLabelText("Dato") as HTMLInputElement).value).toBe("06.05.2026");
    expect((screen.getByLabelText("Klokkeslett") as HTMLInputElement).value).toBe("09:42");
  });

  it("viser 'Vis all historikk'-knapp uansett antall hendelser", async () => {
    const hendelser = Array.from({ length: 3 }, (_, i) =>
      lagBackendHendelse({
        hendelseId: `00000000-0000-4000-8000-00000000${String(i).padStart(4, "0")}`,
        tidspunkt: `2026-03-${String(20 + i).padStart(2, "0")}T10:00:00Z`,
      }),
    );

    await renderMedRouter(<SakHistorikk redigerbar={true} sakId={1} hendelser={hendelser} />);

    expect(screen.getByRole("button", { name: "Vis all historikk (3)" })).toBeDefined();
  });

  it("har ingen duplikate <form>-id-er når 'Vis all historikk' åpnes", async () => {
    // Regresjonstest for bug: SakHistorikk monterte tidligere sin egen
    // LeggTilHistorikkModal, og VisAllHistorikkModal monterte også sin egen
    // instans når den åpnet. @navikt/ds-react sin Modal-komponent portalerer
    // innholdet til document.body og render det uavhengig av åpen/lukket-
    // state, så begge skjema-instansene havnet i DOM-en samtidig.
    // conform-to-react kobler skjemafelt til <form> via et "form"-attributt
    // som må matche en unik id — duplikate id-er på <form>-elementene fikk
    // nettleseren til å koble skjemafelt til feil form ved innsending, som
    // ga «400 Ugyldig handling» i produksjon.
    //
    // Sjekker kun `form[id]` (ikke alle DOM-id-er) siden det er nettopp
    // skjema-id-en conform bruker til form-attributt-koblingen som var
    // problemet — en bredere sjekk risikerer falske positiver fra andre,
    // ufarlige duplikater.
    //
    // Etter at LeggTilHistorikkModal/RedigerHistorikkModal ble løftet til én
    // delt instans eid av SakHistorikk (i stedet for at både SakHistorikk og
    // VisAllHistorikkModal monterte hver sin), er duplikate id-er strukturelt
    // umulig — denne testen låser fortsatt invarianten som generell vaktpost.
    // (Eksplisitte, stabile useForm-id-er ble senere reintrodusert i begge
    // modaler for konsistens med resten av kodebasen — trygt nå som det kun
    // finnes ett mount-punkt per sakId/hendelseId.)
    await renderMedRouter(
      <SakHistorikk redigerbar={true} sakId={1} hendelser={[lagBackendHendelse()]} />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Vis all historikk/ }));
    });
    await waitFor(() => {});

    const formIder = Array.from(document.querySelectorAll("form[id]")).map((el) => el.id);
    const settIder = new Set<string>();
    const duplikater = formIder.filter((id) => {
      if (settIder.has(id)) return true;
      settIder.add(id);
      return false;
    });

    expect(duplikater).toEqual([]);
  });

  it("åpner delt 'Legg til historikkinnslag'-modal fra 'Vis all historikk'", async () => {
    // Verifiserer selve brukerflyten som var brutt: å trykke "Legg til" inne
    // i "Vis all historikk"-modalen skal åpne samme (eneste) instans av
    // LeggTilHistorikkModal som SakHistorikk selv eier — ikke en egen kopi.
    await renderMedRouter(
      <SakHistorikk redigerbar={true} sakId={1} hendelser={[lagBackendHendelse()]} />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Vis all historikk/ }));
    });
    await waitFor(() => {});

    const alleLeggTilKnapper = screen.getAllByRole("button", { name: "Legg til" });
    // Kun én "Legg til"-knapp skal finnes inne i "Vis all historikk"-modalen
    // (den kompakte visningens egen knapp er skjult bak modalen, men fortsatt
    // i DOM-en — vi klikker eksplisitt på den siste, som er inni modalen).
    act(() => {
      fireEvent.click(alleLeggTilKnapper[alleLeggTilKnapper.length - 1]);
    });
    await waitFor(() => {});

    expect(screen.getByText("Legg til historikkinnslag")).toBeDefined();

    // Kun én instans av skjemaet skal finnes i DOM-en.
    expect(screen.getAllByText("Legg til historikkinnslag")).toHaveLength(1);
  });
});

describe("SakHistorikk — feilhåndtering ved lagring", () => {
  async function renderMedAksjon(ui: React.ReactNode, actionResult: unknown) {
    const router = createMemoryRouter(
      [
        {
          path: "/saker/:sakId",
          element: ui,
          action: () => actionResult,
        },
      ],
      { initialEntries: ["/saker/1"] },
    );
    const resultat = render(<RouterProvider router={router} />);
    await waitFor(() => {});
    return resultat;
  }

  const FEILMELDING_STREAMING_BUFFER =
    "Nylig opprettede hendelser kan ikke redigeres eller slettes umiddelbart. " +
    "Dette skyldes en midlertidig begrensning i BigQuery og kan ta opptil 30–90 minutter å løse seg. Prøv igjen senere.";

  it("viser feilmelding og lar 'Legg til'-modalen forbli åpen når lagring feiler (f.eks. 409 fra backend)", async () => {
    await renderMedAksjon(<SakHistorikk redigerbar={true} sakId={1} hendelser={[]} />, {
      ok: false,
      feil: { skjema: [FEILMELDING_STREAMING_BUFFER] },
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Legg til" }));
    });
    await waitFor(() => {});
    act(() => {
      fireEvent.change(screen.getByLabelText("Tittel"), { target: { value: "Ringte bruker" } });
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    });
    await waitFor(() => {});

    await waitFor(() => {
      expect(screen.getByText(FEILMELDING_STREAMING_BUFFER)).toBeDefined();
    });

    // Modalen skal forbli åpen slik at brukeren ser feilmeldingen og kan
    // prøve igjen — ikke lukkes optimistisk som om lagringen lyktes, og
    // ikke kræsje til en generisk feilside.
    const dialog = screen.getByText("Legg til historikkinnslag").closest("dialog");
    expect(dialog?.open).toBe(true);
  });

  it("lukker 'Legg til'-modalen når lagring lykkes", async () => {
    await renderMedAksjon(<SakHistorikk redigerbar={true} sakId={1} hendelser={[]} />, {
      ok: true,
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Legg til" }));
    });
    await waitFor(() => {});
    act(() => {
      fireEvent.change(screen.getByLabelText("Tittel"), { target: { value: "Ringte bruker" } });
    });

    const dialog = screen.getByText("Legg til historikkinnslag").closest("dialog");
    expect(dialog?.open).toBe(true);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    });
    await waitFor(() => {});

    // @navikt/ds-react sin Modal fjerner ikke innholdet fra DOM-en ved
    // lukking (kun native dialog.close()) — sjekk derfor dialog.open
    // fremfor fravær av tekst i DOM-en.
    await waitFor(() => {
      expect(dialog?.open).toBe(false);
    });
  });

  it("viser ikke en gammel feilmelding på nytt når 'Legg til'-modalen åpnes igjen uten nytt forsøk", async () => {
    // Regresjonstest: komponenten forblir montert (eid av SakHistorikk) selv
    // når modalen er lukket, så fetcher.data fra en tidligere feilet
    // innsending kan i prinsippet henge igjen. Feilmeldingen skal derfor
    // kun vises i visningen der den faktisk oppstod — ikke dukke opp igjen
    // ved en senere åpning uten et nytt lagringsforsøk.
    await renderMedAksjon(<SakHistorikk redigerbar={true} sakId={1} hendelser={[]} />, {
      ok: false,
      feil: { skjema: [FEILMELDING_STREAMING_BUFFER] },
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Legg til" }));
    });
    await waitFor(() => {});
    act(() => {
      fireEvent.change(screen.getByLabelText("Tittel"), { target: { value: "Ringte bruker" } });
    });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    });
    await waitFor(() => {});

    await waitFor(() => {
      expect(screen.getByText(FEILMELDING_STREAMING_BUFFER)).toBeDefined();
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    });
    await waitFor(() => {});
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Legg til" }));
    });
    await waitFor(() => {});

    expect(screen.queryByText(FEILMELDING_STREAMING_BUFFER)).toBeNull();
  });

  it("viser feilmelding ved sletting av manuell hendelse i kompakt visning", async () => {
    const hendelse = lagBackendHendelse({
      hendelsesType: "MANUELL_HENDELSE",
      tittel: "Mitt notat",
      opprettetAvNavIdent: "Z999999",
    });

    await renderMedAksjon(<SakHistorikk redigerbar={true} sakId={1} hendelser={[hendelse]} />, {
      ok: false,
      feil: { skjema: [FEILMELDING_STREAMING_BUFFER] },
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Slett" }));
    });
    await waitFor(() => {});

    await waitFor(() => {
      expect(screen.getByText(FEILMELDING_STREAMING_BUFFER)).toBeDefined();
    });
  });
});
