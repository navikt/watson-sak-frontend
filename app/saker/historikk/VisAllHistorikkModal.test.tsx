import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { SakHendelse } from "./typer";
import { VisAllHistorikkModal } from "./VisAllHistorikkModal";

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Saks Behandlersen",
    preferredUsername: "test",
    enhet: "4812",
  }),
}));

function lagHendelse(overrides: Partial<SakHendelse> = {}): SakHendelse {
  return {
    hendelseId: "00000000-0000-4000-8000-000000000001",
    tidspunkt: "2026-03-31T10:15:00Z",
    hendelsesType: "SAK_OPPRETTET",
    sakId: 1,
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

describe("VisAllHistorikkModal", () => {
  it("viser alle hendelser i modalen", () => {
    const hendelser = [
      lagHendelse({ hendelseId: "00000000-0000-4000-8000-000000000001" }),
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000002",
        hendelsesType: "STATUS_ENDRET",
        status: "UTREDES",
      }),
    ];

    renderMedRouter(
      <VisAllHistorikkModal
        redigerbar={true}
        sakId={1}
        hendelser={hendelser}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Sak opprettet")).toBeDefined();
    expect(screen.getByText("Sak utredes")).toBeDefined();
  });

  it("viser 'Rediger'-knapp for egne manuelle notater", () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_NOTAT",
        tittel: "Mitt notat",
        notat: "En beskrivelse",
        opprettetAvNavIdent: "Z999999",
      }),
    ];

    renderMedRouter(
      <VisAllHistorikkModal
        redigerbar={true}
        sakId={1}
        hendelser={hendelser}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Rediger" })).toBeDefined();
  });

  it("viser 'Slett'-knapp for egne manuelle notater", () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_NOTAT",
        tittel: "Mitt notat",
        notat: "En beskrivelse",
        opprettetAvNavIdent: "Z999999",
      }),
    ];

    renderMedRouter(
      <VisAllHistorikkModal
        redigerbar={true}
        sakId={1}
        hendelser={hendelser}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Slett" })).toBeDefined();
  });

  it("viser ikke 'Slett'-knapp for andres manuelle notater", () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_NOTAT",
        tittel: "Andres notat",
        notat: "En beskrivelse",
        opprettetAvNavIdent: "Z111111",
      }),
    ];

    renderMedRouter(
      <VisAllHistorikkModal
        redigerbar={true}
        sakId={1}
        hendelser={hendelser}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Slett" })).toBeNull();
  });

  it("viser ikke 'Rediger'-knapp for andres manuelle notater", () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_NOTAT",
        tittel: "Andres notat",
        notat: "En beskrivelse",
        opprettetAvNavIdent: "Z111111",
      }),
    ];

    renderMedRouter(
      <VisAllHistorikkModal
        redigerbar={true}
        sakId={1}
        hendelser={hendelser}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
  });

  it("viser ikke 'Rediger'-knapp for ikke-manuelle hendelser", () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "SAK_OPPRETTET",
      }),
    ];

    renderMedRouter(
      <VisAllHistorikkModal
        redigerbar={true}
        sakId={1}
        hendelser={hendelser}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
  });

  it("viser tom-melding når det ikke er noen hendelser", () => {
    renderMedRouter(
      <VisAllHistorikkModal
        redigerbar={true}
        sakId={1}
        hendelser={[]}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByText("Ingen historikk for denne saken.")).toBeDefined();
  });

  it("skjuler Rediger/Slett for egne notater når redigerbar er false", () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_NOTAT",
        tittel: "Mitt notat",
        notat: "En beskrivelse",
        opprettetAvNavIdent: "Z999999",
      }),
    ];

    renderMedRouter(
      <VisAllHistorikkModal
        redigerbar={false}
        sakId={1}
        hendelser={hendelser}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Slett" })).toBeNull();
  });
});
