import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import type {
  KontrollsakResponse,
  KontrollsakSaksbehandler,
  KontrollsakSteg,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import { SaksbehandlereKort } from "./SaksbehandlereKort";

const submitMock = vi.fn();
const navigateMock = vi.fn();
let fetcherData:
  | { ok: boolean; feil?: string | { skjema?: string[] }; feilId?: string; teknisk?: boolean }
  | undefined;

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useFetcher: () => ({
      state: "idle",
      data: fetcherData,
      submit: submitMock,
      Form: "form",
    }),
    useNavigate: () => navigateMock,
  };
});

const useInnloggetBrukerMock = vi.fn(() => ({
  navIdent: "Z999999",
  name: "Test Saksbehandler",
  enhet: "4812",
  erLeder: false,
}));

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => useInnloggetBrukerMock(),
}));

vi.mock("~/kodeverk/useKodeverk", () => ({
  useKodeverk: () => mockKodeverk,
}));

function lagSaksbehandler(
  overrides: Partial<KontrollsakSaksbehandler> = {},
): KontrollsakSaksbehandler {
  return {
    navIdent: "Z123456",
    navn: "Ola Saksbehandler",
    enhet: "4812",
    ...overrides,
  };
}

const lederTilgang = {
  harTilgangTilKontrollobjekt: true,
  kanSeHistorikk: true,
  kanSeRelaterteSaker: true,
  kanTildeleSak: true,
  kanSeArkiv: false,
  kanSeFiler: false,
  erLederForSakensEnhet: true,
  ledetEnheter: ["ky153k"],
};

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 101,
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: lagSaksbehandler(),
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    steg: "UTREDES",
    status: null,
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
    ...overrides,
  };
}

function lagTillatteHandlinger(sak: KontrollsakResponse): TillatteHandlingerResponse {
  return {
    versjon: 1,
    tilstand: {
      steg: sak.steg,
      status: sak.status,
      statusFørBero: null,
      resultat: null,
      ytelser: [],
    },
    handlinger: [
      {
        type: "FLYTT_TIL_NESTE_STEG",
        metode: "POST",
        sti: `/api/v1/kontrollsaker/${sak.id}/steg`,
      },
      {
        type: "ENDRE_STATUS",
        metode: "POST",
        sti: `/api/v1/kontrollsaker/${sak.id}/status`,
      },
    ],
    tillatteSteg: ["FORVALTNING"],
    tillatteStatuser: ["AKTIV", "I_BERO"],
    tillatteResultater: ["FEILUTBETALINGSSAK_ORDINAER"],
    paakrevdeRegistreringer: [],
    paakrevdeRegistreringerPerSteg: {},
    feltskjema: [
      {
        felt: "utredning.type",
        etikett: "Resultat fra utredningen",
        datatype: "enum",
        paakrevd: true,
        verdier: [{ verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" }],
      },
      {
        felt: "ytelser[].belop",
        etikett: "Beløp",
        datatype: "belop",
        paakrevd: false,
        verdier: [],
      },
    ],
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

describe("SaksbehandlereKort", () => {
  beforeEach(() => {
    submitMock.mockClear();
    navigateMock.mockClear();
    fetcherData = undefined;
    useInnloggetBrukerMock.mockReturnValue({
      navIdent: "Z999999",
      name: "Test Saksbehandler",
      enhet: "4812",
      erLeder: false,
    });
  });

  it("viser steg og status med knapper for å endre begge", async () => {
    const sak = lagKontrollsak({ status: null });
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={sak}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
        tillatteHandlinger={lagTillatteHandlinger(sak)}
      />,
    );

    expect(screen.getByRole("heading", { name: "Steg og status" })).toBeDefined();
    expect(screen.getByText("Utredning")).toBeDefined();
    expect(screen.getByText("Aktiv")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Endre steg" }));
    expect(
      await screen.findByRole("dialog", { name: "Endre steg eller registrer resultat" }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Send til forvaltning" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Lukk" }));

    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    expect(await screen.findByRole("dialog", { name: "Endre status" })).toBeDefined();
  });

  it("viser resultatet i stedet for status når saken er avsluttet", async () => {
    const sak = lagKontrollsak({
      steg: "AVSLUTTET",
      status: null,
      resultat: {
        forvaltning: {
          type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          endeligUtfall: { type: "HENLAGT" },
        },
      },
    });
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={sak}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
        tillatteHandlinger={lagTillatteHandlinger(sak)}
      />,
    );

    expect(screen.getByRole("heading", { name: "Steg og resultat" })).toBeDefined();
    expect(screen.getByText("Henlagt")).toBeDefined();
    expect(screen.queryByText("Aktiv")).toBeNull();
    expect(screen.queryByRole("button", { name: "Endre status" })).toBeNull();
  });

  it("viser straffedetaljer under taggen for avsluttet sak", async () => {
    const sak = lagKontrollsak({
      steg: "AVSLUTTET",
      status: null,
      resultat: {
        politi: {
          type: "DOMFELLELSE",
          ubetingetFengselDager: 14,
          domfeltBelop: 15000,
        },
      },
    });
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={sak}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
        tillatteHandlinger={lagTillatteHandlinger(sak)}
      />,
    );

    expect(screen.getByText("Avsluttet")).toBeDefined();
    expect(screen.getByText("Domfelt")).toBeDefined();
    expect(screen.getByText("Ubetinget fengsel")).toBeDefined();
    expect(screen.getByText("14 dager")).toBeDefined();
    expect(screen.getByText("Domfelt beløp")).toBeDefined();
    expect(screen.getByText(/^15\s000 kr$/)).toBeDefined();
  });

  it("viser henleggelsesårsak og tilbakekrevd beløp under avsluttet", async () => {
    const sak = lagKontrollsak({
      steg: "AVSLUTTET",
      status: null,
      resultat: {
        forvaltning: {
          type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
          tilbakekrevdBelop: 12500,
        },
        politi: {
          type: "HENLAGT",
          henleggelsesarsak: "FORELDET",
        },
      },
    });
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={sak}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
        tillatteHandlinger={lagTillatteHandlinger(sak)}
      />,
    );

    expect(screen.getByText("Henlagt")).toBeDefined();
    expect(screen.getByText("Årsak")).toBeDefined();
    expect(screen.getByText("Foreldet")).toBeDefined();
    expect(screen.getByText("Tilbakekrevd beløp")).toBeDefined();
    expect(screen.getByText(/^12\s500 kr$/)).toBeDefined();
  });

  it("sender egen handling når Tildel meg brukes", async () => {
    const sak = lagKontrollsak({
      steg: "OPPRETTET",
      saksbehandlere: {
        eier: null,
        deltMed: [],
        opprettetAv: lagSaksbehandler(),
      },
    });
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={sak}
        saksbehandlerDetaljer={[]}
        ansvarligSaksbehandler={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tildel meg" }));
    expect(submitMock).toHaveBeenCalledWith(
      { handling: "TILDEL_MEG" },
      { method: "post", action: expect.any(String) },
    );
  });

  it("viser Legg til i delt tilgang-seksjonen for aktiv sak med ansvarlig saksbehandler", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ steg: "UTREDNING" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Legg til delt tilgang" })).toBeDefined();
    expect(screen.getByText("Legg til").className).toContain("hidden xl:inline");
  });

  it("viser Fjern-tekst for delt tilgang kun fra xl-brekkpunktet", async () => {
    const deltMed = lagSaksbehandler({ navIdent: "Z888888", navn: "Ada Larsen" });
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
          saksbehandlere: {
            eier: lagSaksbehandler(),
            deltMed: [deltMed],
            opprettetAv: lagSaksbehandler(),
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler(), deltMed]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    const fjernKnapp = screen.getByRole("button", { name: "Fjern deling med Ada Larsen" });
    expect(fjernKnapp.querySelector(".hidden")?.className).toContain("xl:inline");
  });

  it("viser Endre i enhetsseksjonen for aktiv sak", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    const knapper = screen.getAllByRole("button").map((knapp) => knapp.textContent);
    expect(knapper).toContain("Endre");
  });

  it("viser status og tilhørighet før enhetsseksjonen", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ enhet: "ky153k" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    const overskrifter = screen.getAllByRole("heading").map((overskrift) => overskrift.textContent);
    expect(overskrifter).toEqual(["Steg og status", "Tilhørighet"]);
    expect(screen.getAllByText("Øst").some((element) => element.tagName === "P")).toBe(true);
  });

  it("viser Ingen når saken mangler enhet", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
          enhet: null,
          saksbehandlere: {
            eier: lagSaksbehandler({ enhet: "" }),
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler({ enhet: "" })}
      />,
    );

    expect(screen.getAllByText("Ingen")).toHaveLength(2);
  });

  it("viser ikke Del tilgang for avsluttet sak", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ steg: "AVSLUTTET" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Del tilgang" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Endre enhet" })).toBeNull();
  });

  it("viser delt tilgang og endring av ansvarlig og enhet for Opprettet", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
          steg: "OPPRETTET",
          saksbehandlere: {
            eier: lagSaksbehandler(),
            deltMed: [lagSaksbehandler({ navIdent: "Z234567", navn: "Ada Larsen" })],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Legg til delt tilgang" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Fjern deling med Ada Larsen" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Endre enhet" })).toBeDefined();
  });

  it("viser ikke Del tilgang for sak med status", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ status: "VENTER_PA_VEDTAK" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Del tilgang" })).toBeNull();
    expect(screen.getByRole("button", { name: "Endre enhet" })).toBeDefined();
  });

  it.each(["UTREDNING", "STRAFFERETTSLIG_VURDERING", "POLITI"] as const)(
    "lar ansvarlig endre enhet i %s selv om saken venter",
    async (steg) => {
      await renderMedRouter(
        <SaksbehandlereKort
          erEier={true}
          sak={lagKontrollsak({ steg, status: "VENTER_PA_VEDTAK" })}
          saksbehandlerDetaljer={[lagSaksbehandler()]}
          ansvarligSaksbehandler={lagSaksbehandler()}
        />,
      );

      expect(screen.getByRole("button", { name: "Endre enhet" })).toBeDefined();
    },
  );

  it.each<[KontrollsakSteg, boolean]>([
    ["OPPRETTET", true],
    ["UTREDNING", false],
    ["FORVALTNING", false],
    ["STRAFFERETTSLIG_VURDERING", true],
    ["POLITI", false],
  ])("lar leder endre enhet for ufordelt sak i %s: %s", async (steg, forventet) => {
    useInnloggetBrukerMock.mockReturnValue({
      navIdent: "Z999999",
      name: "Leder Lederesen",
      enhet: "4812",
      erLeder: true,
    });

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({
          enhet: "ky153k",
          tilgang: lederTilgang,
          steg,
          status: "I_BERO",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        saksbehandlerDetaljer={[]}
        ansvarligSaksbehandler={null}
      />,
    );

    expect(screen.queryByRole("button", { name: "Endre enhet" }) !== null).toBe(forventet);
  });

  it("sender valgt enhet når saken sendes til annen enhet", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
          enhet: "ky153k",
          steg: "UTREDNING",
          saksbehandlere: {
            eier: lagSaksbehandler({ enhet: "NAV Øst" }),
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "NAV Øst" },
          },
        })}
        saksbehandlerDetaljer={[
          lagSaksbehandler({ enhet: "NAV Øst" }),
          lagSaksbehandler({
            navIdent: "Z999999",
            navn: "Ny Saksbehandler",
            enhet: "NAV Vest",
            kontrollEnhetId: "hu424t",
          }),
        ]}
        ansvarligSaksbehandler={lagSaksbehandler({ enhet: "NAV Øst" })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Endre enhet" }));
    await waitFor(() => {});

    const nåværendeEnhet = screen.getByRole("option", { name: "Øst" });
    expect((nåværendeEnhet as HTMLOptionElement).disabled).toBe(true);
    expect(screen.getByRole("option", { name: "Nord" })).toBeDefined();
    fireEvent.change(screen.getByLabelText("Ny enhet"), { target: { value: "hu424t" } });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    expect(screen.getByText("Velg en ny ansvarlig saksbehandler")).toBeDefined();
    fireEvent.change(screen.getByRole("combobox", { name: "Ny ansvarlig saksbehandler" }), {
      target: { value: "Ny Saksbehandler" },
    });
    fireEvent.pointerUp(screen.getByRole("option", { name: "Ny Saksbehandler (Z999999)" }));
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    await waitFor(() => {});
    expect(screen.getAllByText("Ny Saksbehandler (Z999999)").length).toBeGreaterThan(0);
    const sendKnapper = screen.getAllByRole("button", { name: "Send til annen enhet" });
    const sendKnapp = sendKnapper.at(-1);
    if (!sendKnapp) {
      throw new Error("Fant ikke send-knapp i bekreftelsessteget");
    }
    fireEvent.click(sendKnapp);
    await waitFor(() => {});

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("handling")).toBe("send_til_annen_enhet");
    expect(formData.get("seksjon")).toBe("hu424t");
    expect(formData.get("ansvarligNavIdent")).toBe("Z999999");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("viser ikke tilgangsvarsel i enhetsmodalen når saken mangler ansvarlig saksbehandler", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
          steg: "OPPRETTET",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={null}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Endre enhet" }));
    });

    expect(screen.queryByText(/mister tilgang til dokumentasjonen/)).toBeNull();
  });

  it("viser at innlogget saksbehandler selv mister tilgang i enhetsmodalen", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ steg: "OPPRETTET" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler({
          navIdent: "Z999999",
          navn: "Test Saksbehandler",
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Endre enhet" }));
    await waitFor(() => {});
    expect(screen.queryByText(/mister tilgang til dokumentasjonen/)).toBeNull();

    await act(async () => {
      fireEvent.change(screen.getByLabelText("Ny enhet"), { target: { value: "hu424t" } });
      fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    });

    expect(
      screen.getByText("Du fjernes da fra saken og mister tilgang til dokumentasjonen i saken."),
    ).toBeDefined();
  });

  it("viser navnet på en annen ansvarlig saksbehandler som mister tilgang i enhetsmodalen", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ steg: "OPPRETTET" })}
        saksbehandlerDetaljer={[
          lagSaksbehandler(),
          lagSaksbehandler({
            navIdent: "Z888888",
            navn: "Ny Saksbehandler",
            kontrollEnhetId: "hu424t",
          }),
        ]}
        ansvarligSaksbehandler={lagSaksbehandler({
          navIdent: "Z123456",
          navn: "Ola Saksbehandler",
        })}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Endre enhet" }));
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Ny enhet"), { target: { value: "hu424t" } });
      fireEvent.change(screen.getByRole("combobox", { name: "Ny ansvarlig saksbehandler" }), {
        target: { value: "Ny Saksbehandler" },
      });
      fireEvent.pointerUp(screen.getByRole("option", { name: "Ny Saksbehandler (Z888888)" }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    });

    expect(
      screen.getByText(
        "Ola Saksbehandler fjernes da fra saken og mister tilgang til dokumentasjonen i saken.",
      ),
    ).toBeDefined();
  });

  it("venter med å sende brukeren til dashboardet til suksesssteget er lukket", async () => {
    fetcherData = { ok: true };

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ steg: "OPPRETTET" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("skjuler Tildel meg når kanTildeleSak er false", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({
          tilgang: lederTilgang,
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler({ kontrollEnhetId: "ky153k" })]}
        ansvarligSaksbehandler={null}
        kanTildeleSak={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Tildel meg" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tildel saksbehandler" })).toBeDefined();
  });

  it("lar ansvarlig ufordele seg selv i Opprettet", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ steg: "OPPRETTET" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fjern" }));
    expect(submitMock).toHaveBeenCalledWith(
      { handling: "FRISTILL" },
      { method: "post", action: expect.any(String) },
    );
    expect(screen.getByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeDefined();
  });

  it("lar leder ufordele andre i Opprettet", async () => {
    useInnloggetBrukerMock.mockReturnValue({
      navIdent: "Z999999",
      name: "Leder Lederesen",
      enhet: "4812",
      erLeder: true,
    });

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({ steg: "OPPRETTET", enhet: "ky153k", tilgang: lederTilgang })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Fjern" }));
    expect(submitMock).toHaveBeenCalledWith(
      { handling: "FRISTILL" },
      { method: "post", action: expect.any(String) },
    );
    expect(screen.getByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeDefined();
  });

  it("skjuler Endre og Fjern for en saksbehandler uten eierskap eller lederrolle", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({ steg: "OPPRETTET" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Fjern" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Endre enhet" })).toBeNull();
  });

  it("lar leder endre enhet uten å være ansvarlig", async () => {
    useInnloggetBrukerMock.mockReturnValue({
      navIdent: "Z999999",
      name: "Leder Lederesen",
      enhet: "4812",
      erLeder: true,
    });

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({ steg: "UTREDNING", enhet: "ky153k", tilgang: lederTilgang })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Endre enhet" })).toBeDefined();
  });

  it.each([false, true])("skjuler Fjern utenfor Opprettet når erLeder er %s", async (erLeder) => {
    useInnloggetBrukerMock.mockReturnValue({
      navIdent: "Z999999",
      name: "Test Saksbehandler",
      enhet: "4812",
      erLeder,
    });
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ steg: "UTREDNING" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Fjern" })).toBeNull();
    expect(screen.getByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeDefined();
  });

  it.each(["AKTIV", "VENTER_PA_INFORMASJON", "I_BERO"] as const)(
    "lar ansvarlig fristille i Strafferettslig vurdering med status %s",
    async (status) => {
      await renderMedRouter(
        <SaksbehandlereKort
          erEier={true}
          sak={lagKontrollsak({ steg: "STRAFFERETTSLIG_VURDERING", status })}
          saksbehandlerDetaljer={[lagSaksbehandler()]}
          ansvarligSaksbehandler={lagSaksbehandler()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Fjern" }));
      expect(submitMock).toHaveBeenCalledWith(
        { handling: "FRISTILL" },
        { method: "post", action: expect.any(String) },
      );
    },
  );

  it("viser feilmeldingen når backend avviser fristilling", async () => {
    fetcherData = {
      ok: false,
      feil: "Ansvarlig saksbehandler kan bare fjernes i steget Opprettet eller Strafferettslig vurdering",
    };

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ steg: "STRAFFERETTSLIG_VURDERING" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(
      screen.getByText(
        "Ansvarlig saksbehandler kan bare fjernes i steget Opprettet eller Strafferettslig vurdering",
      ),
    ).toBeDefined();
  });

  it("viser kontekstuell feilmelding når fjerning av delt tilgang feiler teknisk", async () => {
    fetcherData = {
      ok: false,
      feil: "Intern feil",
      feilId: "ERR-456",
      teknisk: true,
    };

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
          saksbehandlere: {
            eier: lagSaksbehandler(),
            deltMed: [lagSaksbehandler({ navIdent: "Z888888", navn: "Ada Larsen" })],
            opprettetAv: lagSaksbehandler(),
          },
        })}
        saksbehandlerDetaljer={[
          lagSaksbehandler(),
          lagSaksbehandler({ navIdent: "Z888888", navn: "Ada Larsen" }),
        ]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByText("Vi fikk ikke fjernet tilgangen")).toBeDefined();
    expect(screen.getByText("Sjekk om tilgangen er fjernet før du prøver igjen.")).toBeDefined();
    expect(screen.getAllByText("ERR-456").length).toBeGreaterThan(0);
  });

  it("viser Tildel meg for ufordelt sak i bero", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({
          steg: "STRAFFERETTSLIG_VURDERING",
          status: "I_BERO",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Tildel meg" })).toBeDefined();
  });

  it("viser feilmeldingen når backend avviser Tildel meg", async () => {
    fetcherData = { ok: false, feil: "Du har ikke tilgang til å gjøre denne endringen på saken." };

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        saksbehandlerDetaljer={[]}
        ansvarligSaksbehandler={null}
      />,
    );

    const tildelMeg = screen.getByRole("button", { name: "Tildel meg" });
    const feilEtterKnappen = screen
      .getAllByText("Du har ikke tilgang til å gjøre denne endringen på saken.")
      .filter(
        (element) => tildelMeg.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
      );
    expect(feilEtterKnappen).toHaveLength(1);
  });

  it("skjuler Endre og Fjern for leder i en annen enhet enn saken", async () => {
    useInnloggetBrukerMock.mockReturnValue({
      navIdent: "Z999999",
      name: "Leder Lederesen",
      enhet: "4812",
      erLeder: true,
    });

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({
          steg: "OPPRETTET",
          enhet: "hu424t",
          tilgang: { ...lederTilgang, erLederForSakensEnhet: false },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Fjern" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Endre enhet" })).toBeNull();
  });

  it("viser bare mottakere i sakens enhet eller enheter lederen leder ved overføring", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
          steg: "OPPRETTET",
          enhet: "ky153k",
          tilgang: { ...lederTilgang, erLederForSakensEnhet: false, ledetEnheter: ["gu301n"] },
        })}
        saksbehandlerDetaljer={[
          lagSaksbehandler({ navIdent: "Z100001", navn: "Samme Enhet", kontrollEnhetId: "ky153k" }),
          lagSaksbehandler({ navIdent: "Z100002", navn: "Ledet Enhet", kontrollEnhetId: "gu301n" }),
          lagSaksbehandler({ navIdent: "Z100003", navn: "Annen Enhet", kontrollEnhetId: "hu424t" }),
        ]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Endre ansvarlig saksbehandler" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Saksbehandler" }));
    await waitFor(() => {});

    expect(screen.getByRole("option", { name: "Samme Enhet (Z100001)" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Ledet Enhet (Z100002)" })).toBeDefined();
    expect(screen.queryByRole("option", { name: "Annen Enhet (Z100003)" })).toBeNull();
  });

  it("skjuler Tildel saksbehandler når innlogget ikke leder noen enhet", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak({
          enhet: "ky153k",
          tilgang: { ...lederTilgang, erLederForSakensEnhet: false, ledetEnheter: [] },
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler({ kontrollEnhetId: "ky153k" })]}
        ansvarligSaksbehandler={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Tildel meg" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Tildel saksbehandler" })).toBeNull();
  });
});
