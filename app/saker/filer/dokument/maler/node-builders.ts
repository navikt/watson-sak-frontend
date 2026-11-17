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

export function celle(...innhold: (string | Node)[]): Node {
  return {
    type: "td",
    children: innhold.map((del) => (typeof del === "string" ? p(del) : del)),
  };
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
    rad(celle("PID:"), celle(pMedVariabler(variabel("saksnummer")))),
    rad(celle("Gjelder:"), celle(pMedVariabler(variabel("navn"), ", ", variabel("fødselsnummer")))),
  );
}

export function kontrollrapportHeader(): Node[] {
  return dokumentHeader("Kontrollrapport");
}

function navLogoCelle(): Node {
  return celle({
    type: "img",
    url: "/nav-logo.svg",
    alt: "NAV",
    erStatisk: true,
    children: [{ text: "" }],
  });
}

/**
 * Header for brev til bruker: bare Nav-logoen og mottakerblokken, uten
 * «Unntatt offentlighet»-merking. Brevet går til personen opplysningene gjelder.
 */
export function brevTilBrukerHeader(): Node[] {
  return [
    tabell(rad(navLogoCelle())),
    tabell(
      rad(celle("Til:"), celle(pMedVariabler(variabel("navn")))),
      rad(celle("Adresse:"), celle("[adresse]")),
      rad(celle("Vår ref.:"), celle(pMedVariabler(variabel("saksnummer")))),
      rad(celle("Dato:"), celle(pMedVariabler(variabel("dagens-dato")))),
      rad(celle("Gjelder:"), celle(pMedVariabler(variabel("fødselsnummer")))),
    ),
  ];
}

/** Hilsen og signatur som avslutter brev fra Nav kontroll. */
export function signatur(): Node[] {
  return [
    p("Vennlig hilsen"),
    pMedVariabler("Nav kontroll ", variabel("avdeling")),
    pMedVariabler(variabel("saksbehandler")),
    p("rådgiver"),
  ];
}

/** Nav-logo, «Unntatt offentlighet»-merking og dokumentets hovedtittel. */
export function dokumentHeader(
  tittel: string,
  hjemmel = "jf. Lov om off. § 13 jf. NAV-loven § 7",
): Node[] {
  return [
    tabell(
      rad(
        navLogoCelle(),
        celle({
          type: "p",
          justering: "right",
          bevarLinjeskift: true,
          children: [{ text: "Unntatt offentlighet.\n" }, { text: hjemmel, italic: true }],
        }),
      ),
    ),
    h1(tittel),
  ];
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
