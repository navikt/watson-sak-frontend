import type { DokumentInnhold } from "~/saker/filer/typer";

type Node = Record<string, unknown>;

export function p(text: string): Node {
  return { type: "p", children: [{ text }] };
}

export function h1(text: string): Node {
  return { type: "h1", children: [{ text }] };
}

export function h2(text: string): Node {
  return { type: "h2", children: [{ text }] };
}

export function h3(text: string): Node {
  return { type: "h3", children: [{ text }] };
}

export function ul(items: string[]): Node {
  return {
    type: "ul",
    children: items.map((item) => ({
      type: "li",
      children: [{ type: "lic", children: [{ text: item }] }],
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
    rad(celle("Fra:"), celle("Nav kontroll [enhet]")),
    rad(celle("Dato:"), celle("")),
    rad(celle("PID:"), celle("")),
    rad(celle("Gjelder:"), celle("[navn, fødselsnummer]")),
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
