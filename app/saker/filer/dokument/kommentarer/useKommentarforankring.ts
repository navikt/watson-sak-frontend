import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RangeApi, type TElement } from "platejs";
import type { PlateEditor } from "platejs/react";
import type { DokumentInnhold } from "~/saker/filer/typer";
import {
  blokktekst,
  byggElementAnker,
  byggTekstAnker,
  finnNode,
  kategoriserElement,
  løsAnker,
  type AnkerTreff,
} from "./anker";
import type { AktivtElement } from "./ElementKommentarHandling";
import { KommentarMarkeringPlugin, type Kommentarmarkering } from "./KommentarMarkering";
import { kommentarAnalytics, type Kommentarkilde } from "./kommentarer.analytics";
import type { KommentarUtkast } from "./KommentarPanel";
import { DOKUMENTANKER, klippSitat, type Kommentartraad } from "./typer";

/**
 * Knytter kommentarene til editoren: løser ankere mot dagens dokument, holder
 * dekorasjonene oppdatert, bygger nye ankere fra markering/element, og sørger
 * for navigasjon mellom tråd og tekst.
 *
 * Merk at ingenting her rører dokumentverdien. Autolagring og dokumentlås er
 * helt uavhengige av kommentarene.
 */

/** Hvor lenge vi venter etter siste tastetrykk før ankrene løses på nytt. */
const REFORANKRING_FORSINKELSE_MS = 300;

export function useKommentarforankring({
  editor,
  traader,
  kanKommentere,
}: {
  editor: PlateEditor;
  traader: Kommentartraad[];
  kanKommentere: boolean;
}) {
  const [dokumentversjon, settDokumentversjon] = useState(0);
  const [aktivTraadId, settAktivTraadId] = useState<string | null>(null);
  const [utkast, settUtkast] = useState<KommentarUtkast | null>(null);
  const [aktivtElement, settAktivtElement] = useState<AktivtElement | null>(null);
  const reforankringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Kalles fra editorens onChange. Debounces slik at skriving ikke blir tregt. */
  const registrerDokumentendring = useCallback(() => {
    if (reforankringTimer.current) clearTimeout(reforankringTimer.current);
    reforankringTimer.current = setTimeout(() => {
      settDokumentversjon((versjon) => versjon + 1);
    }, REFORANKRING_FORSINKELSE_MS);
  }, []);

  useEffect(
    () => () => {
      if (reforankringTimer.current) clearTimeout(reforankringTimer.current);
    },
    [],
  );

  const treffPerTraad = useMemo(() => {
    const innhold = editor.children as unknown as DokumentInnhold;
    const kart = new Map<string, AnkerTreff | null>();
    for (const traad of traader) {
      kart.set(traad.id, løsAnker(innhold, traad.anker));
    }
    return kart;
    // `dokumentversjon` er med for å reagere på endringer i editorens innhold,
    // som ikke er en React-verdi vi kan observere direkte.
  }, [editor, traader, dokumentversjon]);

  const markeringer = useMemo<Kommentarmarkering[]>(() => {
    const innhold = editor.children as unknown as DokumentInnhold;
    return (
      traader
        // Løste tråder skal ikke markeres i teksten.
        .filter((traad) => !traad.adressert)
        .flatMap((traad) => {
          const treff = treffPerTraad.get(traad.id);
          if (!treff) return [];
          if (treff.type === "TEXT") {
            return [
              {
                traadId: traad.id,
                path: treff.path,
                startOffset: treff.startOffset,
                sluttOffset: treff.sluttOffset,
              },
            ];
          }
          if (treff.type === "ELEMENT") {
            const node = finnNode(innhold, treff.path);
            const lengde = node ? blokktekst(node).length : 0;
            if (lengde === 0) return [];
            return [{ traadId: traad.id, path: treff.path, startOffset: 0, sluttOffset: lengde }];
          }
          return [];
        })
    );
  }, [editor, traader, treffPerTraad]);

  // Dekorasjonene oppdateres via en stabil nøkkel i stedet for array-identitet.
  // `redecorate()` tvinger en ny render av editoren, så en effekt som kjørte ved
  // hver render ville gitt en uendelig løkke.
  const markeringsnøkkel = useMemo(() => JSON.stringify(markeringer), [markeringer]);
  const markeringerRef = useRef(markeringer);
  markeringerRef.current = markeringer;

  useEffect(() => {
    editor.setOption(KommentarMarkeringPlugin, "markeringer", markeringerRef.current);
    editor.setOption(KommentarMarkeringPlugin, "aktivTraadId", aktivTraadId);
    editor.api.redecorate();
  }, [editor, markeringsnøkkel, aktivTraadId]);

  /** Bygger et tekstanker fra gjeldende markering i editoren. */
  const byggUtkastFraMarkering = useCallback(
    (kilde: Kommentarkilde): KommentarUtkast | null => {
      const utvalg = editor.selection;
      if (!utvalg || RangeApi.isCollapsed(utvalg)) return null;

      const [start, slutt] = RangeApi.edges(utvalg);
      const blokk = editor.api.block<TElement>({ at: start.path });
      if (!blokk) return null;
      const [, blokkSti] = blokk;

      const blokkStart = editor.api.start(blokkSti);
      const blokkSlutt = editor.api.end(blokkSti);
      if (!blokkStart || !blokkSlutt) return null;

      // Markeringen kan strekke seg over flere blokker. Vi forankrer i startblokken
      // og klipper markeringen til den, slik at offsetene alltid er gyldige.
      const snitt = RangeApi.intersection(
        { anchor: blokkStart, focus: blokkSlutt },
        { anchor: start, focus: slutt },
      );
      if (!snitt) return null;

      const [snittStart] = RangeApi.edges(snitt);
      const førTekst = editor.api.string({ anchor: blokkStart, focus: snittStart });
      const markertTekst = editor.api.string(snitt);
      if (markertTekst.trim().length === 0) return null;

      const anker = byggTekstAnker(
        editor.children as unknown as DokumentInnhold,
        blokkSti as number[],
        førTekst.length,
        førTekst.length + markertTekst.length,
      );
      if (!anker) return null;

      return {
        ankertype: "TEXT",
        anker,
        // Sitatet klippes til backendens grense på 2000 tegn. En markering av et
        // helt avsnitt ville ellers gitt 400 og mistet kommentaren.
        opprinneligSitat: klippSitat(markertTekst),
        kilde,
      };
    },
    [editor],
  );

  const startTekstutkast = useCallback(
    (kilde: Kommentarkilde) => {
      if (!kanKommentere) return false;
      const nytt = byggUtkastFraMarkering(kilde);
      if (!nytt) return false;
      settUtkast(nytt);
      settAktivTraadId(null);
      kommentarAnalytics.opprettingStartet({ ankertype: "TEXT", kilde });
      return true;
    },
    [byggUtkastFraMarkering, kanKommentere],
  );

  const startElementutkast = useCallback(
    (element: AktivtElement, kilde: Kommentarkilde) => {
      if (!kanKommentere) return false;
      const innhold = editor.children as unknown as DokumentInnhold;
      const anker = byggElementAnker(innhold, element.path);
      if (!anker) return false;

      const node = finnNode(innhold, element.path);
      const sitat = node ? klippSitat(blokktekst(node)) : "";
      settUtkast({
        ankertype: "ELEMENT",
        anker,
        opprinneligSitat: sitat || undefined,
        elementtype: element.slateType,
        kilde,
      });
      settAktivTraadId(null);
      kommentarAnalytics.opprettingStartet({
        ankertype: "ELEMENT",
        kilde,
        elementtype: kategoriserElement(element.slateType),
      });
      return true;
    },
    [editor, kanKommentere],
  );

  const startGenereltUtkast = useCallback(
    (kilde: Kommentarkilde = "panel") => {
      if (!kanKommentere) return;
      settUtkast({ ankertype: "DOCUMENT", anker: DOKUMENTANKER, kilde });
      settAktivTraadId(null);
      kommentarAnalytics.opprettingStartet({ ankertype: "DOCUMENT", kilde });
    },
    [kanKommentere],
  );

  /**
   * Snarvei Cmd/Ctrl + Shift + M. Med en markering lager den et tekstanker,
   * ellers kommenteres blokken skrivemerket står i.
   */
  const håndterSnarvei = useCallback(
    (event: KeyboardEvent) => {
      const riktigTast = event.key.toLowerCase() === "m" && event.shiftKey;
      if (!riktigTast || !(event.metaKey || event.ctrlKey)) return;
      if (!kanKommentere) return;
      // Ikke kapre snarveien mens man skriver i selve kommentarfeltet.
      const mål = event.target;
      if (mål instanceof HTMLElement && mål.closest("textarea, input, select")) return;

      if (startTekstutkast("tastatursnarvei")) {
        event.preventDefault();
        return;
      }

      const utvalg = editor.selection;
      if (!utvalg) return;
      const blokk = editor.api.block<TElement>({ at: utvalg.anchor.path });
      if (!blokk) return;
      const [node, sti] = blokk;
      const dom = editor.api.toDOMNode(node);
      if (!dom) return;

      if (
        startElementutkast(
          { path: sti as number[], slateType: String(node.type ?? ""), dom },
          "tastatursnarvei",
        )
      ) {
        event.preventDefault();
      }
    },
    [editor, kanKommentere, startElementutkast, startTekstutkast],
  );

  /** Ruller til ankeret for en tråd og blinker det kort opp. */
  const gåTilAnker = useCallback(
    (traad: Kommentartraad) => {
      const treff = treffPerTraad.get(traad.id);
      if (!treff || treff.type === "DOCUMENT") return;

      const innhold = editor.children as unknown as DokumentInnhold;
      const node = finnNode(innhold, treff.path);
      if (!node) return;
      const dom = editor.api.toDOMNode(node as unknown as TElement);
      dom?.scrollIntoView({ block: "center", behavior: "smooth" });
      settAktivTraadId(traad.id);
    },
    [editor, treffPerTraad],
  );

  const velgTraad = useCallback((traadId: string | null) => {
    settAktivTraadId(traadId);
    if (traadId) settUtkast(null);
  }, []);

  /** Finner hvilket element musen/skrivemerket er i, slik at elementknappen kan vises. */
  const oppdaterAktivtElementFraDom = useCallback(
    (mål: EventTarget | null) => {
      if (!(mål instanceof Element)) return;
      const dom = mål.closest<HTMLElement>('[data-slate-node="element"]');
      if (!dom) {
        settAktivtElement(null);
        return;
      }
      const node = editor.api.toSlateNode(dom);
      if (!node) return;
      const sti = editor.api.findPath(node);
      if (!sti) return;
      settAktivtElement({
        path: sti as number[],
        slateType: String((node as TElement).type ?? ""),
        dom,
      });
    },
    [editor],
  );

  return {
    treffPerTraad,
    aktivTraadId,
    velgTraad,
    utkast,
    avbrytUtkast: () => settUtkast(null),
    startTekstutkast,
    startElementutkast,
    startGenereltUtkast,
    håndterSnarvei,
    gåTilAnker,
    aktivtElement,
    oppdaterAktivtElementFraDom,
    registrerDokumentendring,
  };
}
