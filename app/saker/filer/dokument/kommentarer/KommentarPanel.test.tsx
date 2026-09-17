import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnkerTreff } from "./anker";
import { lagKommentar, lagTraad } from "./kommentar-fixtures";
import { KommentarPanel, type KommentarUtkast } from "./KommentarPanel";
import type { Kommentar, Kommentartraad } from "./typer";
import type { KommentarHandlinger, MutasjonResultat } from "./useKommentarer";

const LØST = "2026-03-02T09:00:00Z";

function kommentar(overstyringer: Partial<Kommentar> = {}): Kommentar {
  return lagKommentar({ id: "k1", ...overstyringer });
}

function traad(overstyringer: Partial<Kommentartraad> = {}): Kommentartraad {
  return lagTraad({
    id: "t1",
    opprinneligSitat: "Hei",
    kommentarer: [kommentar()],
    ...overstyringer,
  });
}

const ok: MutasjonResultat = { ok: true, traad: traad() };

function lagHandlinger(overstyringer: Partial<KommentarHandlinger> = {}): KommentarHandlinger {
  return {
    opprettTraad: vi.fn(async () => ok),
    svar: vi.fn(async () => ok),
    rediger: vi.fn(async () => ok),
    slett: vi.fn(async () => ok),
    settAdressering: vi.fn(async () => ok),
    ...overstyringer,
  };
}

function renderPanel({
  traader = [traad()],
  treff = new Map<string, AnkerTreff | null>([
    ["t1", { type: "TEXT", path: [0], startOffset: 0, sluttOffset: 3 }],
  ]),
  handlinger = lagHandlinger(),
  utkast = null as KommentarUtkast | null,
  kanKommentere = true,
  arkivert = false,
  aktivTraadId = null as string | null,
  onVelgTraad = vi.fn(),
  onGåTilAnker = vi.fn(),
  onStartGenereltUtkast = vi.fn(),
  onAvbrytUtkast = vi.fn(),
}: Partial<{
  traader: Kommentartraad[];
  treff: Map<string, AnkerTreff | null>;
  handlinger: KommentarHandlinger;
  utkast: KommentarUtkast | null;
  kanKommentere: boolean;
  arkivert: boolean;
  aktivTraadId: string | null;
  onVelgTraad: () => void;
  onGåTilAnker: () => void;
  onStartGenereltUtkast: () => void;
  onAvbrytUtkast: () => void;
}> = {}) {
  const resultat = render(
    <KommentarPanel
      traader={traader}
      treffPerTraad={treff}
      aktivTraadId={aktivTraadId}
      kanKommentere={kanKommentere}
      arkivert={arkivert}
      sender={false}
      utkast={utkast}
      handlinger={handlinger}
      onStartGenereltUtkast={onStartGenereltUtkast}
      onAvbrytUtkast={onAvbrytUtkast}
      onVelgTraad={onVelgTraad}
      onGåTilAnker={onGåTilAnker}
    />,
  );
  return { ...resultat, handlinger, onVelgTraad, onGåTilAnker, onStartGenereltUtkast };
}

describe("KommentarPanel", () => {
  it("viser navn, tekst, norsk tidspunkt og sitat", () => {
    renderPanel();

    expect(screen.getAllByText("Test Saksbehandler").length).toBeGreaterThan(0);
    expect(screen.getByText("Dette bør presiseres.")).toBeDefined();
    expect(screen.getAllByText(/1\. mars 2026/).length).toBeGreaterThan(0);
    expect(screen.getByText("Hei")).toBeDefined();
  });

  it("viser tom-tilstand når det ikke finnes kommentarer", () => {
    renderPanel({ traader: [], treff: new Map() });

    expect(screen.getByText("Ingen kommentarer på dette dokumentet ennå.")).toBeDefined();
  });

  it("skjuler løste tråder til man slår dem på", () => {
    const løst = traad({
      id: "t2",
      adressert: true,
      kommentarer: [kommentar({ id: "k2", tekst: "Ferdig behandlet." })],
    });
    renderPanel({
      traader: [traad(), løst],
      treff: new Map<string, AnkerTreff | null>([
        ["t1", { type: "TEXT", path: [0], startOffset: 0, sluttOffset: 3 }],
        ["t2", { type: "TEXT", path: [1], startOffset: 0, sluttOffset: 3 }],
      ]),
    });

    expect(screen.queryByText("Ferdig behandlet.")).toBeNull();

    fireEvent.click(screen.getByLabelText("Vis løste (1)"));

    expect(screen.getByText("Ferdig behandlet.")).toBeDefined();
    expect(screen.getByText("Løst")).toBeDefined();
  });

  it("merker frakoblede tråder tydelig", () => {
    renderPanel({ treff: new Map<string, AnkerTreff | null>([["t1", null]]) });

    expect(screen.getByText("Frakoblet – teksten finnes ikke lenger i dokumentet")).toBeDefined();
    // Uten anker finnes det ikke noe sted å navigere til.
    expect(screen.queryByRole("button", { name: "Gå til stedet i dokumentet" })).toBeNull();
  });

  it("lar deg navigere til ankeret", () => {
    const { onGåTilAnker } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Gå til stedet i dokumentet" }));

    expect(onGåTilAnker).toHaveBeenCalled();
  });

  describe("klikk i tråden", () => {
    it("velger tråden og ruller til ankeret når man klikker på selve teksten", () => {
      const { onVelgTraad, onGåTilAnker } = renderPanel();

      fireEvent.click(screen.getByText("Dette bør presiseres."));

      expect(onVelgTraad).toHaveBeenCalledWith("t1");
      expect(onGåTilAnker).toHaveBeenCalled();
    });

    it("ruller ikke bort når man klikker Rediger", () => {
      const { onVelgTraad, onGåTilAnker } = renderPanel();

      fireEvent.click(screen.getByRole("button", { name: "Rediger" }));

      expect(onGåTilAnker).not.toHaveBeenCalled();
      expect(onVelgTraad).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Rediger kommentaren")).toBeDefined();
    });

    it("ruller ikke bort når man skriver i redigeringsfeltet eller lagrer", async () => {
      const handlinger = lagHandlinger();
      const { onGåTilAnker } = renderPanel({ handlinger });

      fireEvent.click(screen.getByRole("button", { name: "Rediger" }));
      const felt = screen.getByLabelText("Rediger kommentaren");
      fireEvent.click(felt);
      fireEvent.change(felt, { target: { value: "Endret tekst" } });
      fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

      await waitFor(() => {
        expect(handlinger.rediger).toHaveBeenCalled();
      });
      expect(onGåTilAnker).not.toHaveBeenCalled();
    });

    it("ruller ikke bort når man klikker Slett og bekrefter", async () => {
      const handlinger = lagHandlinger();
      const { onGåTilAnker } = renderPanel({ handlinger });

      fireEvent.click(screen.getByRole("button", { name: "Slett" }));
      fireEvent.click(screen.getByRole("button", { name: "Bekreft sletting" }));

      await waitFor(() => {
        expect(handlinger.slett).toHaveBeenCalled();
      });
      expect(onGåTilAnker).not.toHaveBeenCalled();
    });

    it("ruller ikke bort når man svarer eller markerer som løst", async () => {
      const handlinger = lagHandlinger();
      const { onGåTilAnker } = renderPanel({ handlinger });

      fireEvent.click(screen.getByRole("button", { name: "Svar" }));
      fireEvent.change(screen.getByLabelText("Svar på kommentaren"), {
        target: { value: "Enig" },
      });
      // Når skjemaet er åpent er «Svar» submit-knappen – den gamle knappen er borte.
      fireEvent.click(screen.getByRole("button", { name: "Svar" }));
      await waitFor(() => {
        expect(handlinger.svar).toHaveBeenCalled();
      });

      expect(onGåTilAnker).not.toHaveBeenCalled();
    });
  });

  it("starter en generell kommentar fra panelknappen", () => {
    const { onStartGenereltUtkast } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Ny kommentar" }));

    expect(onStartGenereltUtkast).toHaveBeenCalled();
  });

  it("lagrer et nytt utkast som trimmet ren tekst", async () => {
    const handlinger = lagHandlinger();
    renderPanel({
      handlinger,
      utkast: {
        ankertype: "DOCUMENT",
        anker: { type: "DOCUMENT" },
        kilde: "panel",
      },
    });

    const felt = screen.getByLabelText("Kommentar");
    fireEvent.change(felt, { target: { value: "  Husk å sjekke dette \n linje to  " } });
    fireEvent.click(screen.getByRole("button", { name: "Legg til kommentar" }));

    await waitFor(() => {
      expect(handlinger.opprettTraad).toHaveBeenCalledWith(
        expect.objectContaining({ tekst: "Husk å sjekke dette \n linje to" }),
      );
    });
  });

  it("krever tekst før en kommentar kan lagres", async () => {
    const handlinger = lagHandlinger();
    renderPanel({
      handlinger,
      utkast: { ankertype: "DOCUMENT", anker: { type: "DOCUMENT" }, kilde: "panel" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Legg til kommentar" }));

    expect(await screen.findByText("Skriv en kommentar før du lagrer.")).toBeDefined();
    expect(handlinger.opprettTraad).not.toHaveBeenCalled();
  });

  it("beholder utkastet og viser konflikten når lagring gir 409", async () => {
    const handlinger = lagHandlinger({
      opprettTraad: vi.fn(async () => ({
        ok: false as const,
        konflikt: true,
        melding: "Kommentaren er endret av noen andre.",
      })),
    });
    renderPanel({
      handlinger,
      utkast: { ankertype: "DOCUMENT", anker: { type: "DOCUMENT" }, kilde: "panel" },
    });

    const felt = screen.getByLabelText("Kommentar") as HTMLTextAreaElement;
    fireEvent.change(felt, { target: { value: "Viktig utkast" } });
    fireEvent.click(screen.getByRole("button", { name: "Legg til kommentar" }));

    expect(await screen.findByText("Kommentaren er endret av noen andre.")).toBeDefined();
    expect(felt.value).toBe("Viktig utkast");
  });

  it("lar deg svare på en tråd", async () => {
    const handlinger = lagHandlinger();
    renderPanel({ handlinger });

    fireEvent.click(screen.getByRole("button", { name: "Svar" }));
    fireEvent.change(screen.getByLabelText("Svar på kommentaren"), {
      target: { value: "Enig" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Svar", hidden: false }));

    await waitFor(() => {
      expect(handlinger.svar).toHaveBeenCalledWith(expect.objectContaining({ id: "t1" }), "Enig");
    });
  });

  it("markerer som løst og gjenåpner", async () => {
    const handlinger = lagHandlinger();
    const { rerender } = renderPanel({ handlinger });

    fireEvent.click(screen.getByRole("button", { name: "Marker som løst" }));
    await waitFor(() => {
      expect(handlinger.settAdressering).toHaveBeenCalledWith(
        expect.objectContaining({ id: "t1" }),
        true,
      );
    });

    rerender(
      <KommentarPanel
        traader={[traad({ resolved: LØST })]}
        treffPerTraad={new Map()}
        aktivTraadId={null}
        kanKommentere
        arkivert={false}
        sender={false}
        utkast={null}
        handlinger={handlinger}
        onStartGenereltUtkast={vi.fn()}
        onAvbrytUtkast={vi.fn()}
        onVelgTraad={vi.fn()}
        onGåTilAnker={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByLabelText("Vis løste (1)"));
    fireEvent.click(screen.getByRole("button", { name: "Gjenåpne" }));

    await waitFor(() => {
      expect(handlinger.settAdressering).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: "t1" }),
        false,
      );
    });
  });

  it("tilbyr rediger og slett bare for kommentarer backend har merket som egne", () => {
    renderPanel({
      traader: [
        traad({
          kommentarer: [
            // Backend, ikke frontend, avgjør hvem som eier kommentaren.
            kommentar({ forfatterIdent: "Z111111", forfatterNavn: "Kari", erEgen: false }),
          ],
        }),
      ],
    });

    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Slett" })).toBeNull();
  });

  it("krever bekreftelse før sletting", async () => {
    const handlinger = lagHandlinger();
    renderPanel({ handlinger });

    fireEvent.click(screen.getByRole("button", { name: "Slett" }));
    expect(handlinger.slett).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Bekreft sletting" }));
    await waitFor(() => {
      expect(handlinger.slett).toHaveBeenCalled();
    });
  });

  it("gjør panelet read-only når dokumentet er arkivert", () => {
    renderPanel({ kanKommentere: false, arkivert: true });

    expect(
      screen.getByText("Dokumentet er arkivert. Kommentarer kan leses, men ikke endres."),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: "Ny kommentar" })).toHaveProperty("disabled", true);
    expect(screen.queryByRole("button", { name: "Svar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Marker som løst" })).toBeNull();
  });

  it("gjør løste tråder read-only, men lar dem gjenåpnes", () => {
    renderPanel({ traader: [traad({ resolved: LØST })], treff: new Map() });
    fireEvent.click(screen.getByLabelText("Vis løste (1)"));

    expect(screen.queryByRole("button", { name: "Svar" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Rediger" })).toBeNull();
    expect(screen.getByRole("button", { name: "Gjenåpne" })).toBeDefined();
  });

  describe("fokushåndtering", () => {
    const toTraader = {
      traader: [traad(), traad({ id: "t2", resolved: LØST })],
      treff: new Map<string, AnkerTreff | null>([
        ["t1", { type: "TEXT", path: [0], startOffset: 0, sluttOffset: 3 } as AnkerTreff],
        ["t2", { type: "TEXT", path: [1], startOffset: 0, sluttOffset: 3 } as AnkerTreff],
      ]),
    };

    it("gir tråden fokus når den velges utenfra", () => {
      const { rerender } = renderPanel({ ...toTraader, aktivTraadId: null });

      rerender(
        <KommentarPanel
          traader={toTraader.traader}
          treffPerTraad={toTraader.treff}
          aktivTraadId="t1"
          kanKommentere
          arkivert={false}
          sender={false}
          utkast={null}
          handlinger={lagHandlinger()}
          onStartGenereltUtkast={vi.fn()}
          onAvbrytUtkast={vi.fn()}
          onVelgTraad={vi.fn()}
          onGåTilAnker={vi.fn()}
        />,
      );

      expect(document.activeElement?.querySelector("[data-kommentartraad]")).not.toBeNull();
    });

    it("stjeler ikke fokus når man slår på «Vis løste»", () => {
      renderPanel({ ...toTraader, aktivTraadId: "t1" });

      // Flytt fokus til en knapp, slik en saksbehandler ville hatt det.
      const nyKommentar = screen.getByRole("button", { name: "Ny kommentar" });
      nyKommentar.focus();
      expect(document.activeElement).toBe(nyKommentar);

      fireEvent.click(screen.getByLabelText("Vis løste (1)"));

      expect(document.activeElement).toBe(nyKommentar);
    });

    it("stjeler ikke fokus når det kommer en ny tråd i lista", () => {
      const handlinger = lagHandlinger();
      const { rerender } = renderPanel({ ...toTraader, aktivTraadId: "t1", handlinger });

      fireEvent.click(screen.getAllByRole("button", { name: "Svar" })[0]);
      const felt = screen.getByLabelText("Svar på kommentaren");
      felt.focus();
      expect(document.activeElement).toBe(felt);

      // En kollega legger til en tråd – antallet synlige tråder endrer seg.
      const nyTraad = traad({ id: "t3" });
      rerender(
        <KommentarPanel
          traader={[...toTraader.traader, nyTraad]}
          treffPerTraad={
            new Map([
              ...toTraader.treff,
              ["t3", { type: "TEXT", path: [2], startOffset: 0, sluttOffset: 3 } as AnkerTreff],
            ])
          }
          aktivTraadId="t1"
          kanKommentere
          arkivert={false}
          sender={false}
          utkast={null}
          handlinger={handlinger}
          onStartGenereltUtkast={vi.fn()}
          onAvbrytUtkast={vi.fn()}
          onVelgTraad={vi.fn()}
          onGåTilAnker={vi.fn()}
        />,
      );

      // Skrivefeltet beholder fokus – panelet river det ikke tilbake til tråden.
      expect(document.activeElement).toBe(felt);
    });
  });

  it("har en live-region som melder fra om endringer", async () => {
    const handlinger = lagHandlinger();
    const { container } = renderPanel({ handlinger });

    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Marker som løst" }));

    await waitFor(() => {
      expect(liveRegion?.textContent).toBe("Kommentaren er markert som løst.");
    });
  });

  it("gir hver tråd et tilgjengelig navn via artikkel-rollen", () => {
    renderPanel();

    const artikkel = screen.getByRole("article", { name: "Test Saksbehandler" });
    expect(within(artikkel).getByText("Dette bør presiseres.")).toBeDefined();
  });

  it("viser elementtypen for elementforankrede tråder", () => {
    renderPanel({
      traader: [
        traad({
          ankertype: "ELEMENT",
          anker: {
            type: "ELEMENT",
            path: [0],
            elementtype: "td",
            fingerprint: "Celle",
          },
          opprinneligSitat: "Celle",
        }),
      ],
      treff: new Map<string, AnkerTreff | null>([["t1", { type: "ELEMENT", path: [0] }]]),
    });

    expect(screen.getByText("Tabellcelle")).toBeDefined();
  });

  it("viser «generell kommentar» for dokumentankere", () => {
    renderPanel({
      traader: [
        traad({
          ankertype: "DOCUMENT",
          anker: { type: "DOCUMENT" },
          opprinneligSitat: null,
        }),
      ],
      treff: new Map<string, AnkerTreff | null>([["t1", { type: "DOCUMENT" }]]),
    });

    expect(screen.getByText("Generell kommentar")).toBeDefined();
  });
});
