import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SakHendelse } from "./typer";
import { SakHistorikk } from "./SakHistorikk";

function lagBackendHendelse(overrides: Partial<SakHendelse> = {}): SakHendelse {
  return {
    hendelseId: "00000000-0000-4000-8000-000000000123",
    tidspunkt: "2026-03-31T10:15:00Z",
    hendelsesType: "SAK_OPPRETTET",
    sakId: "00000000-0000-4000-8000-000000000124",
    kategori: "ARBEID",
    prioritet: "NORMAL",
    status: "OPPRETTET",
    ytelseTyper: ["Sykepenger"],
    ...overrides,
  };
}

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });
  return render(<RouterProvider router={router} />);
}

describe("SakHistorikk", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renderer backend hendelsestype og statusfelt", () => {
    renderMedRouter(<SakHistorikk sakId="test-sak-id" hendelser={[lagBackendHendelse()]} />);

    expect(screen.getByText("Sak opprettet")).toBeDefined();
    expect(screen.getByText(/Status: Opprettet/)).toBeDefined();
  });

  it("renderer avklaringshendelse med oppdatert status", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
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

  it("renderer beskrivelse for statusendring", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "STATUS_ENDRET",
            status: "ANMELDT",
            beskrivelse: "Saken er vurdert og anmeldt",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Status endret")).toBeDefined();
    expect(screen.getByText(/Saken er vurdert og anmeldt – Status: Anmeldt/)).toBeDefined();
  });

  it("renderer historikk for endret ansvarlig saksbehandler", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
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

  it("renderer historikk for fjernet deling", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
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

  it("renderer sak satt på vent med blokkeringsårsak og status", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
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

  it("renderer gjenoppta som vanlig gjenopptak for ventesaker", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
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

  it("renderer gjenoppta som tatt ut av bero for bero-saker", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
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

  it("renderer fritekst for manuelt historikkinnslag", () => {
    renderMedRouter(
      <SakHistorikk
        sakId="test-sak-id"
        hendelser={[
          lagBackendHendelse({
            hendelsesType: "MANUELL_NOTAT",
            tittel: "Ringte bruker",
            notat: "Avklarte dokumentasjon og neste steg.",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Ringte bruker")).toBeDefined();
    expect(screen.getByText("Avklarte dokumentasjon og neste steg.")).toBeDefined();
  });

  it("setter tidspunkt for nytt historikkinnslag når modalen åpnes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-06T08:15:00"));

    renderMedRouter(<SakHistorikk sakId="test-sak-id" hendelser={[lagBackendHendelse()]} />);

    vi.setSystemTime(new Date("2026-05-06T09:42:00"));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Legg til" }));
    });

    expect((screen.getByLabelText("Dato") as HTMLInputElement).value).toBe("06.05.2026");
    expect((screen.getByLabelText("Klokkeslett") as HTMLInputElement).value).toBe("09:42");
  });
});
