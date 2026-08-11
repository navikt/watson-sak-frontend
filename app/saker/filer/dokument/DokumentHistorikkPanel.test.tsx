import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DokumentHistorikk } from "~/saker/filer/typer";
import { DokumentHistorikkPanel } from "./DokumentHistorikkPanel";

const historikkpunkt: DokumentHistorikk = {
  id: "historikk-1",
  tittel: "Tidligere tittel",
  innhold: [{ type: "p", children: [{ text: "Tidligere innhold" }] }],
  endretAvIdent: "Z123456",
  endretAvNavn: "Kari Nordmann",
  endretTidspunkt: "2026-08-10T10:00:00Z",
};

describe("DokumentHistorikkPanel", () => {
  it("viser forhåndsvisning av valgt historikkpunkt", async () => {
    render(
      <DokumentHistorikkPanel
        historikk={[historikkpunkt]}
        kanGjenopprette
        hentHistorikkpunkt={vi.fn().mockResolvedValue(historikkpunkt)}
        gjenopprett={vi.fn()}
        onGjenopprettet={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Tidligere tittel/ }));

    expect(
      await screen.findByRole("heading", { name: "Forhåndsvis historikkpunkt" }),
    ).toBeDefined();
    expect(screen.getByText("Tidligere innhold")).toBeDefined();
    expect(screen.getByRole("button", { name: "Gjenopprett denne versjonen" })).toBeDefined();
  });

  it("gjenoppretter valgt punkt når saksbehandleren bekrefter", async () => {
    const gjenopprett = vi.fn().mockResolvedValue({
      id: "dokument-1",
      tittel: historikkpunkt.tittel,
      innhold: historikkpunkt.innhold,
      endretAv: "Test Saksbehandler",
      endretDato: "2026-08-10",
      låsAv: null,
    });
    const onGjenopprettet = vi.fn();

    render(
      <DokumentHistorikkPanel
        historikk={[historikkpunkt]}
        kanGjenopprette
        hentHistorikkpunkt={vi.fn().mockResolvedValue(historikkpunkt)}
        gjenopprett={gjenopprett}
        onGjenopprettet={onGjenopprettet}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Tidligere tittel/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Gjenopprett denne versjonen" }));

    await waitFor(() => {
      expect(gjenopprett).toHaveBeenCalledWith("historikk-1");
      expect(onGjenopprettet).toHaveBeenCalledTimes(1);
    });
  });

  it("forklarer tidsregelen og lar saksbehandleren prøve igjen ved feil", async () => {
    const hentHistorikkpunkt = vi
      .fn()
      .mockRejectedValueOnce(new Error("feil"))
      .mockResolvedValue(historikkpunkt);

    render(
      <DokumentHistorikkPanel
        historikk={[historikkpunkt]}
        kanGjenopprette
        hentHistorikkpunkt={hentHistorikkpunkt}
        gjenopprett={vi.fn()}
        onGjenopprettet={vi.fn()}
      />,
    );

    expect(screen.getByText(/Dette er det første historikkpunktet/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Tidligere tittel/ }));
    expect(await screen.findByText("Kunne ikke åpne denne versjonen")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Prøv igjen" }));
    expect(await screen.findByText("Tidligere innhold")).toBeDefined();
  });

  it("grupperer ikke historikkpunkter fra ulike saksbehandlere med samme navn", () => {
    render(
      <DokumentHistorikkPanel
        historikk={[
          historikkpunkt,
          {
            ...historikkpunkt,
            id: "historikk-2",
            endretAvIdent: "Z654321",
            endretTidspunkt: "2026-08-10T09:00:00Z",
          },
        ]}
        kanGjenopprette
        hentHistorikkpunkt={vi.fn()}
        gjenopprett={vi.fn()}
        onGjenopprettet={vi.fn()}
      />,
    );

    expect(screen.queryByText(/Redigeringsøkt/)).toBeNull();
  });
});
