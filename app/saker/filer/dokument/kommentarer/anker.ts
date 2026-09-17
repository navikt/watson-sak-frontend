import type { DokumentInnhold } from "~/saker/filer/typer";
import type { Anker, ElementAnker, TekstAnker } from "./typer";

/**
 * Ankermotoren kobler en kommentartråd til et sted i dokumentet uten å skrive
 * kommentar-IDer inn i dokument-JSON-en. Ankrene er eksterne og hybride:
 *
 * 1. stabil node-id (fra `NodeIdPlugin`) hvis dokumentet har det,
 * 2. den opprinnelige Slate-stien,
 * 3. entydig sitat med prefiks/suffiks (for tekst) eller elementavtrykk.
 *
 * Finner vi ikke et entydig treff, blir tråden stående som **frakoblet**: den
 * vises i panelet med sitatet sitt, men uten markering i dokumentet.
 *
 * Funksjonene her jobber på rå Slate-JSON (`DokumentInnhold`) og er derfor
 * uavhengige av Plate – det gjør dem enkle å teste isolert.
 */

type Node = Record<string, unknown>;

/** Hvor mye kontekst vi lagrer på hver side av sitatet for å gjøre det entydig. */
const KONTEKSTLENGDE = 40;
/** Elementavtrykket kortes ned slik at ankeret ikke blir unødvendig stort. */
const FINGERPRINT_LENGDE = 120;

type TekstTreff = {
  type: "TEXT";
  path: number[];
  startOffset: number;
  sluttOffset: number;
};

type ElementTreff = {
  type: "ELEMENT";
  path: number[];
};

type DokumentTreff = {
  type: "DOCUMENT";
};

export type AnkerTreff = TekstTreff | ElementTreff | DokumentTreff;

function erTekstnode(node: unknown): node is { text: string } {
  return !!node && typeof node === "object" && typeof (node as Node).text === "string";
}

function barn(node: unknown): Node[] {
  if (!node || typeof node !== "object") return [];
  const children = (node as Node).children;
  return Array.isArray(children) ? (children as Node[]) : [];
}

/** Henter noden på en sti, eller `undefined` hvis stien ikke finnes lenger. */
export function finnNode(innhold: DokumentInnhold, path: number[]): Node | undefined {
  if (path.length === 0) return undefined;
  let gjeldende: Node | undefined = innhold[path[0]];
  for (const indeks of path.slice(1)) {
    if (!gjeldende) return undefined;
    gjeldende = barn(gjeldende)[indeks];
  }
  return gjeldende;
}

/** Alle tekstnoder under en node, i dokumentrekkefølge, med sin fulle sti. */
export function tekstnoder(node: unknown, basePath: number[]): { path: number[]; tekst: string }[] {
  if (erTekstnode(node)) {
    return [{ path: basePath, tekst: node.text }];
  }
  return barn(node).flatMap((child, indeks) => tekstnoder(child, [...basePath, indeks]));
}

/** Blokkens samlede tekst – grunnlaget for offsetene i et tekstanker. */
export function blokktekst(node: unknown): string {
  return tekstnoder(node, [])
    .map((del) => del.tekst)
    .join("");
}

/**
 * Alle noder som kan bære et anker: elementer som inneholder tekst direkte
 * (avsnitt, overskrift, tabellcelle …) samt void-elementer som bilde og variabel.
 */
export function ankerbareNoder(innhold: DokumentInnhold): { node: Node; path: number[] }[] {
  const resultat: { node: Node; path: number[] }[] = [];

  function besøk(node: Node, path: number[]) {
    const children = barn(node);
    const harDirekteTekst = children.some((child) => erTekstnode(child));
    const harElementbarn = children.some((child) => !erTekstnode(child));

    if (path.length > 0 && (harDirekteTekst || children.length === 0)) {
      resultat.push({ node, path });
    }
    if (harElementbarn) {
      children.forEach((child, indeks) => {
        if (!erTekstnode(child)) besøk(child, [...path, indeks]);
      });
    }
  }

  innhold.forEach((node, indeks) => besøk(node as Node, [indeks]));
  return resultat;
}

/** Sammenligner to Slate-stier i dokumentrekkefølge. */
export function sammenlignStier(a: number[], b: number[]): number {
  const lengde = Math.max(a.length, b.length);
  for (let i = 0; i < lengde; i++) {
    const venstre = a[i] ?? -1;
    const høyre = b[i] ?? -1;
    if (venstre !== høyre) return venstre - høyre;
  }
  return 0;
}

function nodeId(node: Node | undefined): string | undefined {
  const id = node?.id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

function finnNodeMedId(
  innhold: DokumentInnhold,
  id: string,
): { node: Node; path: number[] } | undefined {
  return ankerbareNoder(innhold).find((kandidat) => nodeId(kandidat.node) === id);
}

function normaliser(tekst: string): string {
  return tekst.replaceAll(/\s+/gu, " ").trim();
}

// --- Bygging av ankere ---

export function byggTekstAnker(
  innhold: DokumentInnhold,
  path: number[],
  startOffset: number,
  sluttOffset: number,
): TekstAnker | null {
  const node = finnNode(innhold, path);
  if (!node) return null;

  const tekst = blokktekst(node);
  const start = Math.max(0, Math.min(startOffset, tekst.length));
  const slutt = Math.max(start, Math.min(sluttOffset, tekst.length));
  const exact = tekst.slice(start, slutt);
  if (exact.length === 0) return null;

  return {
    type: "TEXT",
    nodeId: nodeId(node),
    path,
    startOffset: start,
    sluttOffset: slutt,
    exact,
    prefix: tekst.slice(Math.max(0, start - KONTEKSTLENGDE), start),
    suffix: tekst.slice(slutt, slutt + KONTEKSTLENGDE),
  };
}

export function byggElementAnker(innhold: DokumentInnhold, path: number[]): ElementAnker | null {
  const node = finnNode(innhold, path);
  if (!node) return null;

  return {
    type: "ELEMENT",
    nodeId: nodeId(node),
    path,
    elementtype: typeof node.type === "string" ? node.type : "",
    fingerprint: elementFingerprint(node),
  };
}

function elementFingerprint(node: Node): string {
  const tekst = normaliser(blokktekst(node));
  if (tekst.length > 0) return tekst.slice(0, FINGERPRINT_LENGDE);
  // Void-elementer (bilde, variabel) har ingen tekst – bruk identifiserende felter.
  const identitet = [node.filId, node.url, node.alt, node.variabelId].filter(
    (verdi): verdi is string => typeof verdi === "string" && verdi.length > 0,
  );
  return identitet.join("|").slice(0, FINGERPRINT_LENGDE);
}

// --- Løsning av ankere ---

function alleForekomster(tekst: string, søk: string): number[] {
  if (søk.length === 0) return [];
  const treff: number[] = [];
  let indeks = tekst.indexOf(søk);
  while (indeks !== -1) {
    treff.push(indeks);
    indeks = tekst.indexOf(søk, indeks + 1);
  }
  return treff;
}

/** Lengden på den felles slutten til to strenger. */
function fellesSlutt(a: string, b: string): number {
  const maks = Math.min(a.length, b.length);
  let antall = 0;
  while (antall < maks && a[a.length - 1 - antall] === b[b.length - 1 - antall]) antall++;
  return antall;
}

/** Lengden på den felles starten til to strenger. */
function fellesStart(a: string, b: string): number {
  const maks = Math.min(a.length, b.length);
  let antall = 0;
  while (antall < maks && a[antall] === b[antall]) antall++;
  return antall;
}

/** Hvor mange tegn av konteksten som stemmer – brukes til å skille flere like sitater. */
function kontekstpoeng(tekst: string, indeks: number, anker: TekstAnker): number {
  const førTekst = tekst.slice(0, indeks);
  const etterTekst = tekst.slice(indeks + anker.exact.length);
  return fellesSlutt(anker.prefix, førTekst) + fellesStart(anker.suffix, etterTekst);
}

function velgEntydig<T>(kandidater: T[], poeng: (kandidat: T) => number): T | null {
  if (kandidater.length === 0) return null;
  if (kandidater.length === 1) return kandidater[0];

  const scoret = kandidater.map((kandidat) => ({ kandidat, poeng: poeng(kandidat) }));
  const beste = Math.max(...scoret.map((s) => s.poeng));
  const vinnere = scoret.filter((s) => s.poeng === beste);
  // Uten et entydig beste treff lar vi tråden stå frakoblet heller enn å gjette.
  return vinnere.length === 1 ? vinnere[0].kandidat : null;
}

function finnIBlokk(node: Node, path: number[], anker: TekstAnker): TekstTreff | null {
  const tekst = blokktekst(node);
  if (tekst.slice(anker.startOffset, anker.sluttOffset) === anker.exact) {
    return {
      type: "TEXT",
      path,
      startOffset: anker.startOffset,
      sluttOffset: anker.startOffset + anker.exact.length,
    };
  }

  const forekomster = alleForekomster(tekst, anker.exact);
  const valgt = velgEntydig(forekomster, (indeks) => kontekstpoeng(tekst, indeks, anker));
  if (valgt === null) return null;

  return {
    type: "TEXT",
    path,
    startOffset: valgt,
    sluttOffset: valgt + anker.exact.length,
  };
}

function løsTekstAnker(innhold: DokumentInnhold, anker: TekstAnker): TekstTreff | null {
  if (anker.exact.length === 0) return null;

  // 1. Stabil node-id.
  if (anker.nodeId) {
    const viaId = finnNodeMedId(innhold, anker.nodeId);
    if (viaId) {
      const treff = finnIBlokk(viaId.node, viaId.path, anker);
      if (treff) return treff;
    }
  }

  // 2. Opprinnelig sti.
  const viaSti = finnNode(innhold, anker.path);
  if (viaSti) {
    const treff = finnIBlokk(viaSti, anker.path, anker);
    if (treff) return treff;
  }

  // 3. Entydig sitat i hele dokumentet, skilt med prefiks/suffiks.
  const kandidater = ankerbareNoder(innhold).flatMap(({ node, path }) => {
    const tekst = blokktekst(node);
    return alleForekomster(tekst, anker.exact).map((indeks) => ({ path, indeks, tekst }));
  });
  const valgt = velgEntydig(kandidater, (kandidat) =>
    kontekstpoeng(kandidat.tekst, kandidat.indeks, anker),
  );
  if (!valgt) return null;

  return {
    type: "TEXT",
    path: valgt.path,
    startOffset: valgt.indeks,
    sluttOffset: valgt.indeks + anker.exact.length,
  };
}

function løsElementAnker(innhold: DokumentInnhold, anker: ElementAnker): ElementTreff | null {
  // 1. Stabil node-id.
  if (anker.nodeId) {
    const viaId = finnNodeMedId(innhold, anker.nodeId);
    if (viaId) return { type: "ELEMENT", path: viaId.path };
  }

  // 2. Opprinnelig sti, så lenge elementtypen stemmer.
  const viaSti = finnNode(innhold, anker.path);
  if (viaSti && viaSti.type === anker.elementtype) {
    const avtrykk = elementFingerprint(viaSti);
    if (anker.fingerprint.length === 0 || avtrykk === anker.fingerprint) {
      return { type: "ELEMENT", path: anker.path };
    }
  }

  // 3. Entydig elementavtrykk i dokumentet.
  if (anker.fingerprint.length === 0) return null;
  const kandidater = ankerbareNoder(innhold).filter(
    ({ node }) => node.type === anker.elementtype && elementFingerprint(node) === anker.fingerprint,
  );
  if (kandidater.length !== 1) return null;
  return { type: "ELEMENT", path: kandidater[0].path };
}

/** Finner hvor et anker peker i dagens dokument, eller `null` når det er frakoblet. */
export function løsAnker(innhold: DokumentInnhold, anker: Anker): AnkerTreff | null {
  switch (anker.type) {
    case "DOCUMENT":
      return { type: "DOCUMENT" };
    case "TEXT":
      return løsTekstAnker(innhold, anker);
    case "ELEMENT":
      return løsElementAnker(innhold, anker);
    default:
      return null;
  }
}

// --- Elementtyper til visning og analytics ---

/** Lukket sett med elementtyper. Brukes i analytics – aldri fritekst fra dokumentet. */
const ELEMENTTYPER = [
  "avsnitt",
  "overskrift",
  "listepunkt",
  "tabellcelle",
  "bilde",
  "variabel",
  "sitat",
  "annet",
] as const;

export type Elementkategori = (typeof ELEMENTTYPER)[number];

export function kategoriserElement(slateType: unknown): Elementkategori {
  switch (slateType) {
    case "p":
      return "avsnitt";
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return "overskrift";
    case "li":
    case "lic":
      return "listepunkt";
    case "td":
    case "th":
      return "tabellcelle";
    case "img":
      return "bilde";
    case "variabel":
      return "variabel";
    case "blockquote":
      return "sitat";
    default:
      return "annet";
  }
}

const ELEMENT_ETIKETTER: Record<Elementkategori, string> = {
  avsnitt: "Avsnitt",
  overskrift: "Overskrift",
  listepunkt: "Listepunkt",
  tabellcelle: "Tabellcelle",
  bilde: "Bilde",
  variabel: "Variabel",
  sitat: "Sitat",
  annet: "Element",
};

export function elementEtikett(slateType: unknown): string {
  return ELEMENT_ETIKETTER[kategoriserElement(slateType)];
}
