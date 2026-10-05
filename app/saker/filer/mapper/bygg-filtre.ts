import type { DokumentNode, FilResponse } from "../typer";
import { forelder, forfedre, mappenavn } from "./mappesti";

export type MappeTreNode = {
  type: "mappe";
  sti: string;
  navn: string;
  /** Antall dokumenter og filer i mappen, inkludert alle undermapper. */
  antallFiler: number;
  barn: FilTreNode[];
};

type DokumentTreNode = { type: "dokument"; dokument: DokumentNode };
type FilTreElementNode = { type: "fil"; fil: FilResponse };

export type FilTreNode = MappeTreNode | DokumentTreNode | FilTreElementNode;

const sammenlign = new Intl.Collator("nb", { numeric: true, sensitivity: "base" }).compare;

function visningsnavn(node: FilTreNode): string {
  if (node.type === "mappe") return node.navn;
  if (node.type === "dokument") return node.dokument.tittel || "Uten tittel";
  return node.fil.filnavn;
}

/** Mapper først, deretter dokumenter og filer. Alt alfabetisk innenfor hver gruppe. */
function sorter(noder: FilTreNode[]): FilTreNode[] {
  return noder.sort((a, b) => {
    const aErMappe = a.type === "mappe";
    const bErMappe = b.type === "mappe";
    if (aErMappe !== bErMappe) return aErMappe ? -1 : 1;
    return sammenlign(visningsnavn(a), visningsnavn(b));
  });
}

/**
 * Bygger treet som vises i Filer-området, ut fra de flate listene fra backend.
 *
 * - `mapper` er alle mappestier på saken, også tomme mapper.
 * - Et element som peker på en mappe som mangler i `mapper`, får mappen (og forfedrene)
 *   opprettet i treet, slik at ingenting forsvinner fra visningen.
 * - Arkiverte elementer tas ikke med. De vises bare under Arkivert.
 */
export function byggFilTre(
  mapper: string[],
  dokumenter: DokumentNode[],
  filer: FilResponse[],
): FilTreNode[] {
  const mappeNoder = new Map<string, MappeTreNode>();
  const rot: FilTreNode[] = [];

  function hentEllerOpprettMappe(sti: string): MappeTreNode {
    const eksisterende = mappeNoder.get(sti);
    if (eksisterende) return eksisterende;

    for (const forfar of forfedre(sti)) {
      hentEllerOpprettMappe(forfar);
    }
    const node: MappeTreNode = {
      type: "mappe",
      sti,
      navn: mappenavn(sti),
      antallFiler: 0,
      barn: [],
    };
    mappeNoder.set(sti, node);
    const forelderSti = forelder(sti);
    (forelderSti ? hentEllerOpprettMappe(forelderSti).barn : rot).push(node);
    return node;
  }

  function leggTilElement(node: DokumentTreNode | FilTreElementNode, mappe?: string | null) {
    if (!mappe) {
      rot.push(node);
      return;
    }
    const mappeNode = hentEllerOpprettMappe(mappe);
    mappeNode.barn.push(node);
    mappeNode.antallFiler += 1;
    for (const forfar of forfedre(mappe)) {
      const forfarNode = mappeNoder.get(forfar);
      if (forfarNode) forfarNode.antallFiler += 1;
    }
  }

  for (const sti of mapper) {
    hentEllerOpprettMappe(sti);
  }
  for (const dokument of dokumenter) {
    if (!dokument.arkivert) leggTilElement({ type: "dokument", dokument }, dokument.mappe);
  }
  for (const fil of filer) {
    if (!fil.arkivert) leggTilElement({ type: "fil", fil }, fil.mappe);
  }

  sorter(rot);
  for (const node of mappeNoder.values()) {
    sorter(node.barn);
  }
  return rot;
}

/** Alle mappestier i treet, i visningsrekkefølge (dybde først). Brukes i «Flytt til …». */
export function flatMappeliste(tre: FilTreNode[]): MappeTreNode[] {
  return tre.flatMap((node) => (node.type === "mappe" ? [node, ...flatMappeliste(node.barn)] : []));
}
