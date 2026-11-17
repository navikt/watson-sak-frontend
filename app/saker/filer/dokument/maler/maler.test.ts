import { describe, expect, it } from "vitest";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { anmeldelsemal } from "./anmeldelse";
import { arbeidRapportmal } from "./arbeid";
import { ensligForsørgerRapportmal } from "./enslig-forsørger";
import type { KontrollsakSteg } from "~/saker/types.backend";
import {
  BREVMAL_BESKRIVELSE,
  byggMalInnhold,
  erMalTilgjengelig,
  MAL_KATEGORI,
  type MalId,
} from "./index";
import { innhentingsbrevmal } from "./innhentingsbrev";
import { utlandRapportmal } from "./utland";

function variabelIder(innhold: DokumentInnhold): string[] {
  return (
    JSON.stringify(innhold)
      .match(/"variabelId":"([^"]+)"/g)
      ?.map((treff) => treff.replace(/"variabelId":"|"/g, "")) ?? []
  );
}

const MALER: { id: MalId; bygger: typeof arbeidRapportmal }[] = [
  { id: "arbeid", bygger: arbeidRapportmal },
  { id: "enslig-forsørger", bygger: ensligForsørgerRapportmal },
  { id: "utland", bygger: utlandRapportmal },
];

describe("rapportmaler", () => {
  it.each(MALER)("$id: bygger gyldig dokumentinnhold for straffesak", ({ bygger }) => {
    const innhold = bygger({ erStraffesak: true });

    expect(innhold.length).toBeGreaterThan(0);
    for (const node of innhold) {
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("children");
    }
  });

  it.each(MALER)("$id: bygger gyldig dokumentinnhold for ikke-straffesak", ({ bygger }) => {
    const innhold = bygger({ erStraffesak: false });

    expect(innhold.length).toBeGreaterThan(0);
    for (const node of innhold) {
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("children");
    }
  });

  it.each(MALER)("$id: straffesak og ikke-straffesak gir ulikt innhold", ({ bygger }) => {
    const straffesak = bygger({ erStraffesak: true });
    const ikkeStraffesak = bygger({ erStraffesak: false });

    expect(JSON.stringify(straffesak)).not.toBe(JSON.stringify(ikkeStraffesak));
  });

  it.each(MALER)("$id: setter inn relevante standardvariabler", ({ bygger }) => {
    const variabler = variabelIder(bygger({ erStraffesak: false }));

    expect(variabler).toEqual(
      expect.arrayContaining(["navn", "fødselsnummer", "dagens-dato", "saksbehandler", "avdeling"]),
    );
  });

  it.each(MALER)("$id: starter med standardisert kontrollrapport-header", ({ bygger }) => {
    const innhold = bygger({ erStraffesak: false });

    expect(innhold.slice(0, 2)).toEqual([
      {
        type: "table",
        children: [
          {
            type: "tr",
            children: [
              {
                type: "td",
                children: [
                  {
                    type: "img",
                    url: "/nav-logo.svg",
                    alt: "NAV",
                    erStatisk: true,
                    children: [{ text: "" }],
                  },
                ],
              },
              {
                type: "td",
                children: [
                  {
                    type: "p",
                    justering: "right",
                    bevarLinjeskift: true,
                    children: [
                      { text: "Unntatt offentlighet.\n" },
                      { text: "jf. Lov om off. § 13 jf. NAV-loven § 7", italic: true },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { type: "h1", children: [{ text: "Kontrollrapport" }] },
    ]);
  });

  it("byggMalInnhold delegerer til innhentingsbrevet uavhengig av straffesak", () => {
    const straffesak = byggMalInnhold({ malId: "innhentingsbrev", erStraffesak: true });
    const ikkeStraffesak = byggMalInnhold({ malId: "innhentingsbrev", erStraffesak: false });

    expect(JSON.stringify(straffesak)).toBe(JSON.stringify(innhentingsbrevmal()));
    expect(JSON.stringify(ikkeStraffesak)).toBe(JSON.stringify(innhentingsbrevmal()));
  });

  it("byggMalInnhold delegerer til riktig mal basert på malId", () => {
    const arbeid = byggMalInnhold({ malId: "arbeid", erStraffesak: false });
    const utland = byggMalInnhold({ malId: "utland", erStraffesak: false });

    expect(JSON.stringify(arbeid)).toBe(JSON.stringify(arbeidRapportmal({ erStraffesak: false })));
    expect(JSON.stringify(utland)).toBe(JSON.stringify(utlandRapportmal({ erStraffesak: false })));
  });
});

describe("innhentingsbrev", () => {
  const innhold = innhentingsbrevmal();

  it("bygger gyldig dokumentinnhold", () => {
    expect(innhold.length).toBeGreaterThan(0);
    for (const node of innhold) {
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("children");
    }
  });

  it("har tittel «Innhentingsbrev» etter logo-headeren", () => {
    expect(innhold[0]).toHaveProperty("type", "table");
    expect(innhold[1]).toEqual({ type: "h1", children: [{ text: "Innhentingsbrev" }] });
  });

  it("setter inn relevante standardvariabler", () => {
    expect(variabelIder(innhold)).toEqual(
      expect.arrayContaining([
        "navn",
        "fødselsnummer",
        "saksnummer",
        "dagens-dato",
        "saksbehandler",
        "avdeling",
      ]),
    );
  });

  it("tar med lovtekstene som vedlegg", () => {
    const tekst = JSON.stringify(innhold);
    expect(tekst).toContain("Vedlegg: Lovtekster");
    expect(tekst).toContain("Folketrygdloven § 21-4 første, tredje og sjette ledd");
    expect(tekst).toContain("Forvaltningsloven § 14");
  });
});

describe("anmeldelse", () => {
  const innhold = anmeldelsemal();

  it("bygger gyldig dokumentinnhold", () => {
    expect(innhold.length).toBeGreaterThan(0);
    for (const node of innhold) {
      expect(node).toHaveProperty("type");
      expect(node).toHaveProperty("children");
    }
  });

  it("har tittel «Anmeldelse» og egen hjemmel for unntak fra offentlighet", () => {
    expect(innhold[1]).toEqual({ type: "h1", children: [{ text: "Anmeldelse" }] });
    expect(JSON.stringify(innhold[0])).toContain("offl. § 24 andre ledd andre punktum");
  });

  it("setter inn relevante standardvariabler", () => {
    expect(variabelIder(innhold)).toEqual(
      expect.arrayContaining([
        "navn",
        "fødselsnummer",
        "saksnummer",
        "dagens-dato",
        "saksbehandler",
        "avdeling",
      ]),
    );
  });

  it("byggMalInnhold gir samme anmeldelse uavhengig av straffesak", () => {
    expect(JSON.stringify(byggMalInnhold({ malId: "anmeldelse", erStraffesak: false }))).toBe(
      JSON.stringify(innhold),
    );
  });
});

describe("PID-feltet", () => {
  const pidCelle = JSON.stringify({
    type: "td",
    children: [{ type: "p", children: [{ text: "PID:" }] }],
  });
  const saksnummerCelle = JSON.stringify({
    type: "td",
    children: [
      {
        type: "p",
        children: [{ type: "variabel", variabelId: "saksnummer", children: [{ text: "" }] }],
      },
    ],
  });

  it.each([
    ...MALER.map(({ id, bygger }) => ({ id, innhold: bygger({ erStraffesak: false }) })),
    { id: "anmeldelse", innhold: anmeldelsemal() },
  ])("$id: PID er saksnummeret", ({ innhold }) => {
    expect(JSON.stringify(innhold)).toContain(`${pidCelle},${saksnummerCelle}`);
  });
});

describe("orienteringsbrev til bruker", () => {
  const BREV: { id: MalId; tittel: string; steg: KontrollsakSteg[] }[] = [
    {
      id: "orientering-innhenting-konto",
      tittel: "Nav kontroll innhenter opplysninger fra finansinstitusjon",
      steg: ["UTREDNING", "UTREDES"],
    },
    {
      id: "orientering-innhenting-valutaregister",
      tittel: "Nav kontroll innhenter opplysninger fra Valutaregisteret",
      steg: ["UTREDNING", "UTREDES"],
    },
    {
      id: "orientering-avsluttet-innhenting-konto",
      tittel: "Informasjon om avsluttet undersøkelse",
      steg: ["UTREDNING", "UTREDES"],
    },
    {
      id: "orientering-anmeldelse",
      tittel: "Informasjon om anmeldelse",
      steg: ["STRAFFERETTSLIG_VURDERING"],
    },
    {
      id: "orientering-henleggelse",
      tittel: "Vi anmelder ikke saken din",
      steg: ["STRAFFERETTSLIG_VURDERING"],
    },
  ];
  const ALLE_STEG: KontrollsakSteg[] = [
    "OPPRETTET",
    "UTREDNING",
    "UTREDES",
    "FORVALTNING",
    "STRAFFERETTSLIG_VURDERING",
    "POLITI",
    "ANMELDT",
    "AVSLUTTET",
  ];

  it.each(BREV)("$id: er en brevmal med beskrivelse", ({ id }) => {
    expect(MAL_KATEGORI[id]).toBe("brev");
    expect(BREVMAL_BESKRIVELSE[id]).toBeTruthy();
  });

  it.each(BREV)(
    "$id: har riktig tittel og er ikke merket unntatt offentlighet",
    ({ id, tittel }) => {
      const innhold = byggMalInnhold({ malId: id, erStraffesak: false });
      const tekst = JSON.stringify(innhold);

      expect(innhold).toContainEqual({ type: "h1", children: [{ text: tittel }] });
      expect(tekst).not.toContain("Unntatt offentlighet");
      expect(tekst).toContain("/nav-logo.svg");
    },
  );

  it.each(BREV)("$id: setter inn relevante standardvariabler", ({ id }) => {
    const innhold = byggMalInnhold({ malId: id, erStraffesak: false });

    expect(variabelIder(innhold)).toEqual(
      expect.arrayContaining([
        "navn",
        "fødselsnummer",
        "saksnummer",
        "dagens-dato",
        "saksbehandler",
        "avdeling",
      ]),
    );
  });

  it.each(BREV)("$id: er bare tilgjengelig i riktige steg", ({ id, steg }) => {
    for (const s of ALLE_STEG) {
      expect(erMalTilgjengelig(id, s)).toBe(steg.includes(s));
    }
  });
});
