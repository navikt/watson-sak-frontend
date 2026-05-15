import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [],
    merking: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
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
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(screen.getByRole("button", { name: "Del tilgang" })).toBeDefined();
  });

  it("viser Send til annen enhet nederst for aktiv sak", () => {
    renderMedRouter(
      <SaksbehandlereKort
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    const knapper = screen.getAllByRole("button").map((knapp) => knapp.textContent);
    expect(knapper.at(-1)).toBe("Send til annen enhet");
  });

  it("viser ikke Del tilgang for avsluttet sak", () => {
    renderMedRouter(
      <SaksbehandlereKort
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
        sak={lagKontrollsak({
          saksbehandlere: {
            eier: lagSaksbehandler({ enhet: "ØST" }),
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "ØST" },
          },
        })}
        saksbehandlerDetaljer={[lagSaksbehandler({ enhet: "ØST" })]}
        ansvarligSaksbehandler={lagSaksbehandler({ enhet: "ØST" })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send til annen enhet" }));

    const nåværendeEnhet = screen.getByRole("option", { name: "Øst" });
    expect((nåværendeEnhet as HTMLOptionElement).disabled).toBe(true);
    expect(screen.getByRole("option", { name: "Nord" })).toBeDefined();
    fireEvent.change(screen.getByLabelText("Ny enhet"), { target: { value: "NORD" } });
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
    expect(formData.get("seksjon")).toBe("NORD");
    expect(options).toEqual(expect.objectContaining({ method: "post" }));
  });

  it("sender brukeren til dashboardet når saken er sendt til annen enhet", () => {
    fetcherData = { ok: true };

    renderMedRouter(
      <SaksbehandlereKort
        sak={lagKontrollsak()}
        saksbehandlerDetaljer={[lagSaksbehandler()]}
        ansvarligSaksbehandler={lagSaksbehandler()}
      />,
    );

    expect(navigateMock).toHaveBeenCalledWith("/");
  });
});
