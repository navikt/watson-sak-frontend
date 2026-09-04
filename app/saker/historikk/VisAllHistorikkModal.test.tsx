import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SakHendelse } from "./typer";
import { VisAllHistorikkModal } from "./VisAllHistorikkModal";

function lagHendelse(overrides: Partial<SakHendelse> = {}): SakHendelse {
  return {
    hendelseId: "00000000-0000-4000-8000-000000000001",
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

const INNLOGGET_NAV_IDENT = "Z999999";

async function renderModal(props: Partial<React.ComponentProps<typeof VisAllHistorikkModal>> = {}) {
  const resultat = render(
    <VisAllHistorikkModal
      redigerbar={true}
      hendelser={[]}
      åpen={true}
      onClose={() => {}}
      innloggetNavIdent={INNLOGGET_NAV_IDENT}
      onLeggTil={vi.fn()}
      onRediger={vi.fn()}
      onSlett={vi.fn()}
      {...props}
    />,
  );
  await waitFor(() => {});
  return resultat;
}

describe("VisAllHistorikkModal", () => {
  it("viser alle hendelser i modalen", async () => {
    const hendelser = [
      lagHendelse({ hendelseId: "00000000-0000-4000-8000-000000000001" }),
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000002",
        hendelsesType: "STATUS_ENDRET",
        status: "UTREDES",
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.getByText("Sak opprettet")).toBeDefined();
    expect(screen.getByText("Sak utredes")).toBeDefined();
  });

  it("viser 'Rediger'-knapp for egne manuelle notater", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_HENDELSE",
        tittel: "Mitt notat",
        beskrivelse: "En beskrivelse",
        opprettetAvNavIdent: INNLOGGET_NAV_IDENT,
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.getByRole("button", { name: "Rediger" })).toBeDefined();
  });

  it("viser 'Slett'-knapp for egne manuelle notater", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_HENDELSE",
        tittel: "Mitt notat",
        beskrivelse: "En beskrivelse",
        opprettetAvNavIdent: INNLOGGET_NAV_IDENT,
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.getByRole("button", { name: "Slett" })).toBeDefined();
  });

  it("viser ikke 'Slett'-knapp for andres manuelle notater", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_HENDELSE",
        tittel: "Andres notat",
        beskrivelse: "En beskrivelse",
        opprettetAvNavIdent: "Z111111",
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.queryByRole("button", { name: "Slett" })).toBeNull();
  });

  it("viser ikke 'Rediger'-knapp for andres manuelle notater", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_HENDELSE",
        tittel: "Andres notat",
        beskrivelse: "En beskrivelse",
        opprettetAvNavIdent: "Z111111",
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
  });

  it("viser ikke 'Rediger'-knapp for ikke-manuelle hendelser", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "SAK_OPPRETTET",
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
  });

  it("viser tom-melding når det ikke er noen hendelser", async () => {
    await renderModal({ hendelser: [] });

    expect(screen.getByText("Ingen historikk for denne saken.")).toBeDefined();
  });

  it("skjuler Rediger/Slett for egne notater når redigerbar er false", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_HENDELSE",
        tittel: "Mitt notat",
        beskrivelse: "En beskrivelse",
        opprettetAvNavIdent: INNLOGGET_NAV_IDENT,
      }),
    ];

    await renderModal({ redigerbar: false, hendelser });

    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Slett" })).toBeNull();
  });

  it("viser filterknapper med riktig antall for hver kategori", async () => {
    const hendelser = [
      lagHendelse({ hendelseId: "00000000-0000-4000-8000-000000000001" }),
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000002",
        hendelsesType: "STATUS_ENDRET",
        status: "UTREDES",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000003",
        hendelsesType: "MANUELL_HENDELSE",
        tittel: "Mitt notat",
        beskrivelse: "En beskrivelse",
        opprettetAvNavIdent: INNLOGGET_NAV_IDENT,
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.getByRole("radio", { name: "Alle (3)" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Automatiske (2)" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Manuelle (1)" })).toBeDefined();
  });

  it("viser kun manuelle hendelser når 'Manuelle'-filteret velges", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "SAK_OPPRETTET",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000002",
        hendelsesType: "MANUELL_HENDELSE",
        tittel: "Mitt notat",
        beskrivelse: "En beskrivelse",
        opprettetAvNavIdent: INNLOGGET_NAV_IDENT,
      }),
    ];

    await renderModal({ hendelser });

    fireEvent.click(screen.getByRole("radio", { name: "Manuelle (1)" }));

    expect(screen.queryByText("Sak opprettet")).toBeNull();
    expect(screen.getByText("Mitt notat")).toBeDefined();
  });

  it("deaktiverer 'Manuelle'-filteret når det ikke finnes manuelle hendelser", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "SAK_OPPRETTET",
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.getByRole("radio", { name: "Manuelle (0)" })).toHaveProperty("disabled", true);
  });

  it("deaktiverer 'Automatiske'-filteret når det bare finnes manuelle hendelser", async () => {
    const hendelser = [
      lagHendelse({
        hendelseId: "00000000-0000-4000-8000-000000000001",
        hendelsesType: "MANUELL_HENDELSE",
        tittel: "Mitt notat",
        beskrivelse: "En beskrivelse",
        opprettetAvNavIdent: INNLOGGET_NAV_IDENT,
      }),
    ];

    await renderModal({ hendelser });

    expect(screen.getByRole("radio", { name: "Automatiske (0)" })).toHaveProperty("disabled", true);
  });

  it("viser 'Legg til'-knapp øverst når redigerbar er true", async () => {
    await renderModal({ hendelser: [] });

    expect(screen.getByRole("button", { name: "Legg til" })).toBeDefined();
  });

  it("skjuler 'Legg til'-knapp når redigerbar er false", async () => {
    await renderModal({ redigerbar: false, hendelser: [] });

    expect(screen.queryByRole("button", { name: "Legg til" })).toBeNull();
  });

  it("kaller onLeggTil når 'Legg til' klikkes", async () => {
    const onLeggTil = vi.fn();
    await renderModal({ hendelser: [], onLeggTil });

    fireEvent.click(screen.getByRole("button", { name: "Legg til" }));

    expect(onLeggTil).toHaveBeenCalledOnce();
  });

  it("kaller onRediger med riktig hendelse når 'Rediger' klikkes", async () => {
    const onRediger = vi.fn();
    const hendelse = lagHendelse({
      hendelseId: "00000000-0000-4000-8000-000000000001",
      hendelsesType: "MANUELL_HENDELSE",
      tittel: "Mitt notat",
      opprettetAvNavIdent: INNLOGGET_NAV_IDENT,
    });

    await renderModal({ hendelser: [hendelse], onRediger });

    fireEvent.click(screen.getByRole("button", { name: "Rediger" }));

    expect(onRediger).toHaveBeenCalledWith(hendelse);
  });

  it("kaller onSlett med riktig hendelse når 'Slett' klikkes", async () => {
    const onSlett = vi.fn();
    const hendelse = lagHendelse({
      hendelseId: "00000000-0000-4000-8000-000000000001",
      hendelsesType: "MANUELL_HENDELSE",
      tittel: "Mitt notat",
      opprettetAvNavIdent: INNLOGGET_NAV_IDENT,
    });

    await renderModal({ hendelser: [hendelse], onSlett });

    fireEvent.click(screen.getByRole("button", { name: "Slett" }));

    expect(onSlett).toHaveBeenCalledWith(hendelse);
  });
});
