import { createContext, useContext } from "react";
import type { NodeEntry, TElement } from "platejs";
import { createPlatePlugin, PlateLeaf, type PlateLeafProps } from "platejs/react";
import { sammenlignStier, tekstnoder } from "./anker";

/**
 * Midlertidige Plate-dekorasjoner for kommentarmarkeringer.
 *
 * Kommentar-IDer skrives **aldri** inn i dokumentets JSON. I stedet løser
 * ankermotoren tråder til (sti, offset) ved hver render, og dette pluginet
 * legger dekorasjoner oppå teksten. Dekorasjoner er per definisjon flyktige –
 * de er ikke en del av dokumentverdien og påvirker derfor verken autolagring
 * eller dokumenthistorikk.
 *
 * `@platejs/comment` er ikke installert i prosjektet, og vi ønsker heller ikke
 * dens dokumentlagrede kommentar-marks. Derfor denne lettvektsvarianten.
 */

const KOMMENTAR_MARKERING_KEY = "kommentarMarkering";

export type Kommentarmarkering = {
  traadId: string;
  path: number[];
  startOffset: number;
  sluttOffset: number;
};

type Segment = {
  start: number;
  slutt: number;
  traadIder: string[];
  tastaturTraadId?: string;
};

type KommentarKontekst = {
  aktivTraadId: string | null;
  onVelgTraad: (traadId: string) => void;
};

const KommentarMarkeringContext = createContext<KommentarKontekst>({
  aktivTraadId: null,
  onVelgTraad: () => {},
});

export function KommentarMarkeringProvider({
  aktivTraadId,
  onVelgTraad,
  children,
}: KommentarKontekst & { children: React.ReactNode }) {
  return (
    <KommentarMarkeringContext.Provider value={{ aktivTraadId, onVelgTraad }}>
      {children}
    </KommentarMarkeringContext.Provider>
  );
}

/**
 * Deler overlappende markeringer i disjunkte segmenter, slik at et tegn som er
 * dekket av flere kommentarer blir ett leaf som kjenner alle trådene sine.
 */
export function segmenter(markeringer: Kommentarmarkering[]): Segment[] {
  const grenser = new Set<number>();
  for (const markering of markeringer) {
    grenser.add(markering.startOffset);
    grenser.add(markering.sluttOffset);
  }
  const sorterte = [...grenser].sort((a, b) => a - b);

  const resultat: Segment[] = [];
  for (let i = 0; i < sorterte.length - 1; i++) {
    const start = sorterte[i];
    const slutt = sorterte[i + 1];
    if (slutt <= start) continue;
    const traadIder = markeringer
      .filter((markering) => markering.startOffset <= start && markering.sluttOffset >= slutt)
      .map((markering) => markering.traadId);
    const tastaturTraadId = markeringer.find(
      (markering) => markering.startOffset === start && traadIder.includes(markering.traadId),
    )?.traadId;
    if (traadIder.length > 0) resultat.push({ start, slutt, traadIder, tastaturTraadId });
  }
  return resultat;
}

/** Oversetter et offset i blokkens samlede tekst til et Slate-punkt. */
function tilPunkt(
  deler: { path: number[]; tekst: string }[],
  offset: number,
): { path: number[]; offset: number } | null {
  let brukt = 0;
  for (const del of deler) {
    if (offset <= brukt + del.tekst.length) {
      return { path: del.path, offset: offset - brukt };
    }
    brukt += del.tekst.length;
  }
  const siste = deler.at(-1);
  return siste ? { path: siste.path, offset: siste.tekst.length } : null;
}

export const KommentarMarkeringPlugin = createPlatePlugin({
  key: KOMMENTAR_MARKERING_KEY,
  node: { isLeaf: true },
  options: {
    markeringer: [] as Kommentarmarkering[],
    aktivTraadId: null as string | null,
  },
  decorate: ({ entry, getOptions }) => {
    const [node, path] = entry as NodeEntry<TElement>;
    const { markeringer, aktivTraadId } = getOptions();
    if (markeringer.length === 0) return;

    const relevante = markeringer.filter(
      (markering) => sammenlignStier(markering.path, path as number[]) === 0,
    );
    if (relevante.length === 0) return;

    const deler = tekstnoder(node, path as number[]);
    if (deler.length === 0) return;

    return segmenter(relevante).flatMap((segment) => {
      const anchor = tilPunkt(deler, segment.start);
      const focus = tilPunkt(deler, segment.slutt);
      if (!anchor || !focus) return [];
      return [
        {
          anchor,
          focus,
          [KOMMENTAR_MARKERING_KEY]: true,
          kommentarTraadIder: segment.traadIder,
          kommentarTastaturTraadId: segment.tastaturTraadId,
          kommentarAktiv: !!aktivTraadId && segment.traadIder.includes(aktivTraadId),
        },
      ];
    });
  },
});

type MarkeringLeaf = {
  kommentarTraadIder?: string[];
  kommentarAktiv?: boolean;
  kommentarTastaturTraadId?: string;
};

export function KommentarMarkeringLeaf(props: PlateLeafProps) {
  const { aktivTraadId, onVelgTraad } = useContext(KommentarMarkeringContext);
  const leaf = props.leaf as MarkeringLeaf;
  const traadIder = leaf.kommentarTraadIder ?? [];
  const erAktiv = leaf.kommentarAktiv ?? (!!aktivTraadId && traadIder.includes(aktivTraadId));
  const antall = traadIder.length;
  const tastaturTraadId = leaf.kommentarTastaturTraadId;
  const tilgjengeligNavn =
    antall > 1
      ? `${antall} kommentarer. Åpne kommentarpanelet.`
      : "Kommentar. Åpne kommentarpanelet.";
  const velgTraad = (traadId = traadIder[0]) => {
    if (traadId) onVelgTraad(traadId);
  };

  return (
    <PlateLeaf
      {...props}
      as="mark"
      attributes={{
        ...props.attributes,
        "data-kommentartraad": traadIder[0],
        "data-kommentar-aktiv": erAktiv ? "true" : "false",
        role: "button",
        tabIndex: tastaturTraadId ? 0 : -1,
        "aria-label": tilgjengeligNavn,
        title: tilgjengeligNavn,
        onClick: () => velgTraad(),
        onKeyDownCapture: (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          velgTraad(tastaturTraadId);
        },
        className:
          "cursor-pointer rounded-xs text-ax-text-neutral " +
          (erAktiv ? "bg-ax-bg-warning-moderate" : "bg-ax-bg-warning-soft"),
      }}
    >
      {props.children}
    </PlateLeaf>
  );
}
