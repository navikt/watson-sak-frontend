import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import type { KontrollsakResponse, KontrollsakSaksbehandler } from "~/saker/types.backend";
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

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    enhet: "4812",
  }),
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
    status: "UTREDES",
    blokkert: null,
    henleggelsesarsak: null,
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
  });

  it("viser Del tilgang i saksbehandler-boksen for aktiv sak med ansvarlig saksbehandler", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Del tilgang" })).toBeDefined();
  });

  it("viser Send til annen enhet i enhetsseksjonen øverst for aktiv sak", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    const knapper = screen.getAllByRole("button").map((knapp) => knapp.textContent);
    expect(knapper.at(0)).toBe("Send til annen enhet");
  });

  it("viser enhetsseksjonen over saksbehandlerseksjonen", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ enhet: "ky153k" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    const overskrifter = screen.getAllByRole("heading").map((overskrift) => overskrift.textContent);
    expect(overskrifter.slice(0, 2)).toEqual(["Enhet", "Saksbehandler"]);
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

    expect(screen.getByText("Ingen")).toBeDefined();
  });

  it("viser ikke Del tilgang for avsluttet sak", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ status: "AVSLUTTET" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Del tilgang" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send til annen enhet" })).toBeNull();
  });

  it("viser ikke Del tilgang for blokkert sak", async () => {
    await renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak({ blokkert: "VENTER_PA_VEDTAK" })}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Del tilgang" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send til annen enhet" })).toBeNull();
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

    fireEvent.click(screen.getByRole("button", { name: "Send til annen enhet" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Send til annen enhet" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Send til annen enhet" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Send til annen enhet" }));
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
});
