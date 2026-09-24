import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import type {
  KontrollsakResponse,
  KontrollsakSaksbehandler,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import { SaksbehandlereKort } from "./SaksbehandlereKort";

const submitMock = vi.fn();
const navigateMock = vi.fn();
let fetcherData: { ok: boolean } | undefined;

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
    tillatteResultater: [],
    paakrevdeRegistreringer: [],
    paakrevdeRegistreringerPerSteg: {},
    feltskjema: [],
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
    expect(screen.getByText("Utredes")).toBeDefined();
    expect(screen.getByText("Aktiv")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Endre steg" }));
    expect(await screen.findByRole("dialog", { name: "Endre steg" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    expect(await screen.findByRole("dialog", { name: "Endre status" })).toBeDefined();
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
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Legg til delt tilgang" })).toBeDefined();
    expect(screen.getByText("Legg til").className).toContain("hidden xl:inline");
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

  it("skjuler delt tilgang, men tillater endring av ansvarlig og enhet for Opprettet", async () => {
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

    expect(screen.queryByRole("button", { name: "Del tilgang" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fjern deling med Ada Larsen" })).toBeNull();
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
    expect(screen.queryByRole("button", { name: "Endre enhet" })).toBeNull();
  });

  it("sender valgt enhet når saken sendes til annen enhet", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
          enhet: "ky153k",
          saksbehandlere: {
            eier: lagSaksbehandler({ enhet: "NAV Øst" }),
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "NAV Øst" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler({ enhet: "NAV Øst" })]}
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
    await waitFor(() => {});
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
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("viser ikke tilgangsvarsel i enhetsmodalen når saken mangler ansvarlig saksbehandler", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({
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
        sak={lagKontrollsak()}
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
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler({
          navIdent: "Z123456",
          navn: "Ola Saksbehandler",
        })}
      />,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Endre enhet" }));
      fireEvent.change(screen.getByLabelText("Ny enhet"), { target: { value: "hu424t" } });
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
        sak={lagKontrollsak()}
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
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={null}
        kanTildeleSak={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Tildel meg" })).toBeNull();
    expect(screen.getByRole("button", { name: "Tildel saksbehandler" })).toBeDefined();
  });

  it("viser Fjern saksbehandler for sakens ansvarlige saksbehandler", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    const fjernKnapp = screen.getByRole("button", { name: "Fjern saksbehandler" });
    expect(screen.getByText("Fjern").className).toContain("hidden xl:inline");
    fireEvent.click(fjernKnapp);

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [payload, options] = submitMock.mock.calls[0];
    expect(payload).toEqual({ handling: "FRISTILL" });
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("viser Fjern saksbehandler for en leder som ikke er sakseier", async () => {
    useInnloggetBrukerMock.mockReturnValue({
      navIdent: "Z999999",
      name: "Leder Lederesen",
      enhet: "4812",
      erLeder: true,
    });

    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Fjern saksbehandler" })).toBeDefined();
  });

  it("skjuler Fjern saksbehandler for en saksbehandler uten eierskap eller lederrolle", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={false}
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Fjern saksbehandler" })).toBeNull();
  });
});
