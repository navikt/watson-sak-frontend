import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { lagKommentar, lagTraad } from "./kommentar-fixtures";
import { KommentarTraad } from "./KommentarTraad";
import type { KommentarHandlinger, MutasjonResultat } from "./useKommentarer";

const tekniskFeil: MutasjonResultat = {
  ok: false,
  konflikt: false,
  melding: "Utelat denne tekniske teksten",
  teknisk: true,
  feilId: "FEIL-123",
  usikker: false,
};
const ok: MutasjonResultat = { ok: true, traad: lagTraad() };

function renderTraad(handlinger: Partial<KommentarHandlinger> = {}, adressert = false) {
  const standardhandlinger: KommentarHandlinger = {
    opprettTraad: vi.fn(async () => ok),
    svar: vi.fn(async () => ok),
    rediger: vi.fn(async () => ok),
    slett: vi.fn(async () => ok),
    settAdressering: vi.fn(async () => ok),
  };

  return render(
    <KommentarTraad
      traad={lagTraad({ adressert, kommentarer: [lagKommentar()] })}
      treff={null}
      erAktiv={false}
      kanKommentere
      sender={false}
      handlinger={{ ...standardhandlinger, ...handlinger }}
      onVelg={vi.fn()}
      onGåTilAnker={vi.fn()}
      onMelding={vi.fn()}
    />,
  );
}

describe("KommentarTraad tekniske feil", () => {
  it("viser teknisk feil-ID og riktig melding når sletting feiler", async () => {
    renderTraad({ slett: vi.fn(async () => tekniskFeil) });

    fireEvent.click(screen.getByRole("button", { name: "Slett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft sletting" }));

    expect(
      await screen.findByRole("heading", { name: "Vi fikk ikke slettet kommentaren" }),
    ).toBeDefined();
    expect(screen.getByText("Prøv igjen om litt.")).toBeDefined();
    expect(screen.getByText("FEIL-123")).toBeDefined();
  });

  it("viser «vet ikke» når vi ikke fikk svar på slettingen", async () => {
    renderTraad({ slett: vi.fn(async () => ({ ...tekniskFeil, usikker: true })) });

    fireEvent.click(screen.getByRole("button", { name: "Slett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft sletting" }));

    expect(
      await screen.findByRole("heading", { name: "Vi vet ikke om kommentaren ble slettet" }),
    ).toBeDefined();
    expect(screen.getByText("Last inn siden og se om kommentaren fortsatt vises.")).toBeDefined();
  });

  it("viser teknisk feil-ID og riktig melding når markering som løst feiler", async () => {
    renderTraad({ settAdressering: vi.fn(async () => tekniskFeil) });

    fireEvent.click(screen.getByRole("button", { name: "Marker som løst" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Vi fikk ikke markert kommentaren som løst" }),
      ).toBeDefined();
    });
    expect(screen.getByText("Prøv igjen om litt.")).toBeDefined();
    expect(screen.getByText("FEIL-123")).toBeDefined();
  });
});
