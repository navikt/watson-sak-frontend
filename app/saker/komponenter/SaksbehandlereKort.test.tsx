import { fireEvent, render, screen } from "@testing-library/react";
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

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("SaksbehandlereKort", () => {
  beforeEach(() => {
    submitMock.mockClear();
    navigateMock.mockClear();
    fetcherData = undefined;
  });

  it("viser Del tilgang i saksbehandler-boksen for aktiv sak med ansvarlig saksbehandler", () => {
    renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Del tilgang" })).toBeDefined();
  });

  it("viser Send til annen enhet i enhetsseksjonen øverst for aktiv sak", () => {
    renderMedRouter(
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

  it("viser enhetsseksjonen over saksbehandlerseksjonen", () => {
    renderMedRouter(
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

  it("viser Ingen når saken mangler enhet", () => {
    renderMedRouter(
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

  it("viser ikke Del tilgang for avsluttet sak", () => {
    renderMedRouter(
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

  it("viser ikke Del tilgang for blokkert sak", () => {
    renderMedRouter(
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
    renderMedRouter(
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

    const nåværendeEnhet = screen.getByRole("option", { name: "Øst" });
    expect((nåværendeEnhet as HTMLOptionElement).disabled).toBe(true);
    expect(screen.getByRole("option", { name: "Nord" })).toBeDefined();
    fireEvent.change(screen.getByLabelText("Ny enhet"), { target: { value: "hu424t" } });
    const sendKnapper = screen.getAllByRole("button", { name: "Send til annen enhet" });
    const sendKnapp = sendKnapper.at(-1);
    if (!sendKnapp) {
      throw new Error("Fant ikke send-knapp i modal");
    }
    fireEvent.click(sendKnapp);

    expect(submitMock).toHaveBeenCalledTimes(1);
    const [formData, options] = submitMock.mock.calls[0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("handling")).toBe("send_til_annen_enhet");
    expect(formData.get("seksjon")).toBe("hu424t");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("sender brukeren til dashboardet når saken er sendt til annen enhet", () => {
    fetcherData = { ok: true };

    renderMedRouter(
      <SaksbehandlereKort
        erEier={true}
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("skjuler Tildel meg når kanTildeleSak er false", () => {
    renderMedRouter(
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
