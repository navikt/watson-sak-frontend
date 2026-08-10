import type { DokumentInnhold } from "~/saker/filer/typer";
import type { VariabelId } from "../variabler/variabel-typer";

type Node = Record<string, unknown>;

const STØNADSMOTTAKER_MARKØR = "[stønadsmottaker]";

/** Bygger en inline, levende variabel-node som editoren løser til aktuell verdi. */
export function variabel(variabelId: VariabelId): Node {
  return { type: "variabel", variabelId, children: [{ text: "" }] };
}

function tekstBarn(tekst: string): Node[] {
  return tekst
    .split(STØNADSMOTTAKER_MARKØR)
    .flatMap((del, indeks, deler) => [
      { text: del },
      ...(indeks < deler.length - 1 ? [variabel("navn")] : []),
    ]);
}

function kombinerteTekstBarn(...deler: (string | Node)[]): Node[] {
  return deler.flatMap((del) => (typeof del === "string" ? tekstBarn(del) : [del]));
}

export function p(text: string): Node {
  return { type: "p", children: tekstBarn(text) };
}

export function pMedVariabler(...deler: (string | Node)[]): Node {
  return { type: "p", children: kombinerteTekstBarn(...deler) };
}

export function h1(text: string): Node {
  return { type: "h1", children: tekstBarn(text) };
}

export function h2(text: string): Node {
  return { type: "h2", children: tekstBarn(text) };
}

export function h3(text: string): Node {
  return { type: "h3", children: tekstBarn(text) };
}

export function ul(items: string[]): Node {
  return {
    type: "ul",
    children: items.map((item) => ({
      type: "li",
      children: [{ type: "lic", children: tekstBarn(item) }],
    })),
  };
}

export function tabell(...rader: Node[]): Node {
  return { type: "table", children: rader };
}

export function rad(...celler: Node[]): Node {
  return { type: "tr", children: celler };
}

export function celle(innhold: string | Node): Node {
  const child = typeof innhold === "string" ? p(innhold) : innhold;
  return { type: "td", children: [child] };
}

export function topptekst(innhold: string | Node): Node {
  const child = typeof innhold === "string" ? p(innhold) : innhold;
  return { type: "th", children: [child] };
}

export function metadataTabell(): Node {
  return tabell(
    rad(celle("Til:"), celle("")),
    rad(celle("Fra:"), celle(pMedVariabler("Nav kontroll ", variabel("avdeling")))),
    rad(celle("Dato:"), celle(pMedVariabler(variabel("dagens-dato")))),
    rad(celle("PID:"), celle(pMedVariabler(variabel("fødselsnummer")))),
    rad(celle("Gjelder:"), celle(pMedVariabler(variabel("navn"), ", ", variabel("fødselsnummer")))),
  );
}

export function stønadSammendragTabell(): Node {
  return tabell(
    rad(topptekst("Stønad"), topptekst("Fra"), topptekst("Til")),
    rad(celle(""), celle(""), celle("")),
  );
}

export function mal(noder: (Node | Node[])[]): DokumentInnhold {
  return noder.flat() as DokumentInnhold;
}
