import { describe, expect, it } from "vitest";
import type { DokumentInnhold } from "~/saker/filer/typer";
import {
  ankerbareNoder,
  blokktekst,
  byggElementAnker,
  byggTekstAnker,
  elementEtikett,
  kategoriserElement,
  løsAnker,
  sammenlignStier,
} from "./anker";
import type { TekstAnker } from "./typer";

/** Feiler testen tydelig hvis ankeret ikke lot seg bygge. */
function krev<T>(verdi: T | null): T {
  if (verdi === null) throw new Error("Forventet et anker");
  return verdi;
}

function avsnitt(tekst: string, id?: string): Record<string, unknown> {
  return id
    ? { type: "p", id, children: [{ text: tekst }] }
    : { type: "p", children: [{ text: tekst }] };
}

const enkeltDokument: DokumentInnhold = [
  avsnitt("Saksbehandler har vurdert saken grundig."),
  avsnitt("Konklusjonen er at forholdet må følges opp."),
];

describe("byggTekstAnker", () => {
  it("lagrer sitat, kontekst og sti", () => {
    const anker = byggTekstAnker(enkeltDokument, [0], 26, 31);

    expect(anker).toMatchObject({
      type: "TEXT",
      path: [0],
      startOffset: 26,
      sluttOffset: 31,
      exact: "saken",
    });
    expect(anker?.prefix).toContain("vurdert ");
    expect(anker?.suffix).toContain(" grundig");
  });

  it("tar med node-id når dokumentet har en", () => {
    const medId: DokumentInnhold = [avsnitt("Et avsnitt med id.", "blokk-1")];
    expect(byggTekstAnker(medId, [0], 0, 2)?.nodeId).toBe("blokk-1");
  });

  it("returnerer null for en tom markering", () => {
    expect(byggTekstAnker(enkeltDokument, [0], 5, 5)).toBeNull();
  });

  it("returnerer null når stien ikke finnes", () => {
    expect(byggTekstAnker(enkeltDokument, [9], 0, 3)).toBeNull();
  });
});

describe("løsAnker for tekst", () => {
  it("finner teksten på uendret sti og offset", () => {
    const anker = byggTekstAnker(enkeltDokument, [0], 26, 31) as TekstAnker;

    expect(løsAnker(enkeltDokument, anker)).toEqual({
      type: "TEXT",
      path: [0],
      startOffset: 26,
      sluttOffset: 31,
    });
  });

  it("følger node-id når avsnittet har flyttet seg", () => {
    const original: DokumentInnhold = [
      avsnitt("Første avsnitt.", "a"),
      avsnitt("Et unikt sitat her.", "b"),
    ];
    const anker = byggTekstAnker(original, [1], 3, 8) as TekstAnker;

    const flyttet: DokumentInnhold = [
      avsnitt("Nytt avsnitt satt inn først.", "c"),
      avsnitt("Første avsnitt.", "a"),
      avsnitt("Et unikt sitat her.", "b"),
    ];

    expect(løsAnker(flyttet, anker)).toMatchObject({ type: "TEXT", path: [2] });
  });

  it("finner teksten på nytt offset i samme blokk når det er satt inn tekst foran", () => {
    const original: DokumentInnhold = [avsnitt("Vurdering av inntekt.", "a")];
    const anker = byggTekstAnker(original, [0], 13, 20) as TekstAnker;
    expect(anker.exact).toBe("inntekt");

    const endret: DokumentInnhold = [avsnitt("Ny og grundig vurdering av inntekt.", "a")];
    expect(løsAnker(endret, anker)).toMatchObject({
      type: "TEXT",
      path: [0],
      startOffset: 27,
      sluttOffset: 34,
    });
  });

  it("finner et entydig sitat i et helt annet avsnitt når blokken er borte", () => {
    const original: DokumentInnhold = [avsnitt("Et helt spesielt uttrykk står her.")];
    const anker = byggTekstAnker(original, [0], 8, 24) as TekstAnker;
    expect(anker.exact).toBe("spesielt uttrykk");

    const omstrukturert: DokumentInnhold = [
      avsnitt("Nytt førsteavsnitt."),
      avsnitt("Nå står spesielt uttrykk lenger ned."),
    ];
    expect(løsAnker(omstrukturert, anker)).toMatchObject({ type: "TEXT", path: [1] });
  });

  it("bruker prefiks og suffiks til å velge riktig av flere like sitater", () => {
    const original: DokumentInnhold = [avsnitt("A: vedtak om stans. B: vedtak om opphør.")];
    // Andre forekomst av «vedtak».
    const anker = byggTekstAnker(original, [0], 23, 29) as TekstAnker;
    expect(anker.exact).toBe("vedtak");

    const endret: DokumentInnhold = [
      avsnitt("Innledning."),
      avsnitt("A: vedtak om stans. B: vedtak om opphør."),
    ];
    expect(løsAnker(endret, anker)).toMatchObject({
      type: "TEXT",
      path: [1],
      startOffset: 23,
    });
  });

  it("gir frakoblet tråd når sitatet er slettet", () => {
    const anker = byggTekstAnker(enkeltDokument, [0], 26, 31) as TekstAnker;
    const slettet: DokumentInnhold = [avsnitt("Helt annen tekst uten treff.")];

    expect(løsAnker(slettet, anker)).toBeNull();
  });

  it("gir frakoblet tråd når sitatet finnes flere ganger uten entydig kontekst", () => {
    const anker: TekstAnker = {
      type: "TEXT",
      path: [5],
      startOffset: 0,
      sluttOffset: 4,
      exact: "stans",
      prefix: "",
      suffix: "",
    };
    const flertydig: DokumentInnhold = [avsnitt("stans"), avsnitt("stans")];

    expect(løsAnker(flertydig, anker)).toBeNull();
  });

  it("håndterer sitat som går over flere tekstnoder i samme avsnitt", () => {
    const medMarks: DokumentInnhold = [
      {
        type: "p",
        children: [{ text: "Det er " }, { text: "fet", bold: true }, { text: " tekst her." }],
      },
    ];
    expect(blokktekst(medMarks[0])).toBe("Det er fet tekst her.");

    const anker = byggTekstAnker(medMarks, [0], 7, 16) as TekstAnker;
    expect(anker.exact).toBe("fet tekst");
    expect(løsAnker(medMarks, anker)).toMatchObject({ startOffset: 7, sluttOffset: 16 });
  });

  it("finner tekst i en tabellcelle", () => {
    const medTabell: DokumentInnhold = [
      {
        type: "table",
        children: [
          {
            type: "tr",
            children: [
              { type: "td", children: [{ text: "Beløp utbetalt" }] },
              { type: "td", children: [{ text: "12 000 kroner" }] },
            ],
          },
        ],
      },
    ];

    const anker = byggTekstAnker(medTabell, [0, 0, 1], 0, 6) as TekstAnker;
    expect(anker.exact).toBe("12 000");
    expect(løsAnker(medTabell, anker)).toMatchObject({ path: [0, 0, 1] });
  });
});

describe("løsAnker for elementer", () => {
  it("finner elementet på uendret sti", () => {
    const anker = krev(byggElementAnker(enkeltDokument, [1]));
    expect(anker).toMatchObject({ type: "ELEMENT", elementtype: "p" });
    expect(løsAnker(enkeltDokument, anker)).toEqual({ type: "ELEMENT", path: [1] });
  });

  it("følger node-id når elementet har flyttet seg", () => {
    const original: DokumentInnhold = [avsnitt("Én.", "a"), avsnitt("To.", "b")];
    const anker = krev(byggElementAnker(original, [1]));
    const flyttet: DokumentInnhold = [avsnitt("To.", "b"), avsnitt("Én.", "a")];

    expect(løsAnker(flyttet, anker)).toEqual({ type: "ELEMENT", path: [0] });
  });

  it("finner elementet på nytt sted via avtrykket når stien har endret seg", () => {
    const original: DokumentInnhold = [avsnitt("Unik konklusjon om saken.")];
    const anker = krev(byggElementAnker(original, [0]));
    const endret: DokumentInnhold = [
      avsnitt("Nytt avsnitt."),
      avsnitt("Unik konklusjon om saken."),
    ];

    expect(løsAnker(endret, anker)).toEqual({ type: "ELEMENT", path: [1] });
  });

  it("gir frakoblet tråd når elementet er slettet", () => {
    const original: DokumentInnhold = [avsnitt("Skal slettes.")];
    const anker = krev(byggElementAnker(original, [0]));

    expect(løsAnker([avsnitt("Noe helt annet.")], anker)).toBeNull();
  });

  it("forankrer bilder på filId når de ikke har tekst", () => {
    const medBilde: DokumentInnhold = [
      { type: "img", filId: "fil-1", url: "/api/fil-1", children: [{ text: "" }] },
    ];
    const anker = krev(byggElementAnker(medBilde, [0]));
    expect(anker.fingerprint).toContain("fil-1");

    const flyttet: DokumentInnhold = [
      avsnitt("Nytt avsnitt."),
      { type: "img", filId: "fil-1", url: "/api/fil-1", children: [{ text: "" }] },
    ];
    expect(løsAnker(flyttet, anker)).toEqual({ type: "ELEMENT", path: [1] });
  });

  it("forankrer variabler på variabelId", () => {
    const medVariabel: DokumentInnhold = [
      { type: "variabel", variabelId: "navn", children: [{ text: "" }] },
    ];
    const anker = krev(byggElementAnker(medVariabel, [0]));
    expect(anker.fingerprint).toBe("navn");
    expect(løsAnker(medVariabel, anker)).toEqual({ type: "ELEMENT", path: [0] });
  });
});

describe("dokumentanker", () => {
  it("løses alltid", () => {
    expect(løsAnker(enkeltDokument, { type: "DOCUMENT" })).toEqual({
      type: "DOCUMENT",
    });
  });
});

describe("hjelpefunksjoner", () => {
  it("sammenligner stier i dokumentrekkefølge", () => {
    expect(sammenlignStier([0], [1])).toBeLessThan(0);
    expect(sammenlignStier([1, 0], [1])).toBeGreaterThan(0);
    expect(sammenlignStier([2, 1], [2, 1])).toBe(0);
  });

  it("finner alle ankerbare noder, også inne i tabeller", () => {
    const medTabell: DokumentInnhold = [
      avsnitt("Topptekst."),
      {
        type: "table",
        children: [
          {
            type: "tr",
            children: [{ type: "td", children: [{ text: "Celle" }] }],
          },
        ],
      },
    ];

    expect(ankerbareNoder(medTabell).map((n) => n.path)).toEqual([[0], [1, 0, 0]]);
  });

  it("kategoriserer elementtyper til et lukket sett", () => {
    expect(kategoriserElement("p")).toBe("avsnitt");
    expect(kategoriserElement("h2")).toBe("overskrift");
    expect(kategoriserElement("li")).toBe("listepunkt");
    expect(kategoriserElement("td")).toBe("tabellcelle");
    expect(kategoriserElement("img")).toBe("bilde");
    expect(kategoriserElement("variabel")).toBe("variabel");
    expect(kategoriserElement("ukjent-type")).toBe("annet");
  });

  it("gir norske etiketter for elementtyper", () => {
    expect(elementEtikett("h1")).toBe("Overskrift");
    expect(elementEtikett("td")).toBe("Tabellcelle");
  });
});
