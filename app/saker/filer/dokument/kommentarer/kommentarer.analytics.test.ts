import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { kommentarAnalytics } from "./kommentarer.analytics";

const sporHendelse = vi.hoisted(() => vi.fn());

vi.mock("~/analytics/analytics", () => ({ sporHendelse }));

describe("kommentar-analytics", () => {
  beforeEach(() => {
    sporHendelse.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sporer at panelet ble åpnet med kilde", () => {
    kommentarAnalytics.panelÅpnet("markering");

    expect(sporHendelse).toHaveBeenCalledWith("kommentarpanel åpnet", { kilde: "markering" });
  });

  it("sender elementtype bare for elementankere", () => {
    kommentarAnalytics.opprettingStartet({ ankertype: "TEXT", kilde: "tekstmarkering" });
    expect(sporHendelse).toHaveBeenLastCalledWith("kommentar oppretting startet", {
      ankertype: "TEXT",
      kilde: "tekstmarkering",
    });

    kommentarAnalytics.opprettingStartet({
      ankertype: "ELEMENT",
      kilde: "element",
      elementtype: "tabellcelle",
    });
    expect(sporHendelse).toHaveBeenLastCalledWith("kommentar oppretting startet", {
      ankertype: "ELEMENT",
      kilde: "element",
      elementtype: "tabellcelle",
    });
  });

  it("skiller konflikt fra andre feil i resultatet", () => {
    kommentarAnalytics.redigeringFeilet("TEXT", "konflikt");
    expect(sporHendelse).toHaveBeenLastCalledWith("kommentar redigering feilet", {
      ankertype: "TEXT",
      resultat: "konflikt",
    });

    kommentarAnalytics.slettingFeilet("DOCUMENT", "feil");
    expect(sporHendelse).toHaveBeenLastCalledWith("kommentar sletting feilet", {
      ankertype: "DOCUMENT",
      resultat: "feil",
    });
  });

  it("sporer løsing, gjenåpning, navigasjon og filter", () => {
    kommentarAnalytics.adressert("ELEMENT");
    kommentarAnalytics.gjenåpnet("ELEMENT");
    kommentarAnalytics.ankernavigasjon("TEXT", "til_anker");
    kommentarAnalytics.filterBrukt("vis_loste", "på");

    expect(sporHendelse.mock.calls).toEqual([
      ["kommentartråd løst", { ankertype: "ELEMENT" }],
      ["kommentartråd gjenåpnet", { ankertype: "ELEMENT" }],
      ["kommentar ankernavigasjon", { ankertype: "TEXT", handling: "til_anker" }],
      ["kommentarfilter brukt", { filter: "vis_loste", handling: "på" }],
    ]);
  });

  it("sender aldri fritekst, navn eller identifikatorer", () => {
    kommentarAnalytics.opprettet({ ankertype: "TEXT", kilde: "panel" });
    kommentarAnalytics.svarOpprettet("TEXT");
    kommentarAnalytics.redigert("TEXT");
    kommentarAnalytics.slettet("TEXT");

    const tillatteNøkler = new Set([
      "ankertype",
      "elementtype",
      "kilde",
      "handling",
      "resultat",
      "filter",
    ]);
    for (const [, data] of sporHendelse.mock.calls) {
      for (const nøkkel of Object.keys(data as Record<string, unknown>)) {
        expect(tillatteNøkler.has(nøkkel)).toBe(true);
      }
    }
  });

  it("holder alle hendelsesnavn innenfor Umami sin grense på 50 tegn", () => {
    kommentarAnalytics.panelÅpnet("panel");
    kommentarAnalytics.opprettingStartet({ ankertype: "TEXT", kilde: "panel" });
    kommentarAnalytics.opprettingAvbrutt({ ankertype: "TEXT", kilde: "panel" });
    kommentarAnalytics.opprettingFeilet({ ankertype: "TEXT", kilde: "panel", resultat: "feil" });
    kommentarAnalytics.svarFeilet("TEXT", "feil");
    kommentarAnalytics.adresseringFeilet("TEXT", "løs", "konflikt");

    for (const [navn] of sporHendelse.mock.calls) {
      expect((navn as string).length).toBeLessThanOrEqual(50);
    }
  });
});
