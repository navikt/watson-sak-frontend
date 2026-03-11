import type { Journalpost, Journalposttype } from "./typer";

const temaer = [
  "Arbeidsavklaringspenger",
  "Dagpenger",
  "Sykepenger",
  "Foreldrepenger",
  "Uføretrygd",
  "Alderspensjon",
  "Barnebidrag",
  "Kontantstøtte",
  "Barnetrygd",
  "Grunn- og hjelpestønad",
];

const titler: Record<Journalposttype, string[]> = {
  inngående: [
    "Søknad om arbeidsavklaringspenger",
    "Klage på vedtak",
    "Ettersendelse av dokumentasjon",
    "Legeerklæring",
    "Inntektsopplysninger",
    "Arbeidsavtale",
    "Bekreftelse fra arbeidsgiver",
    "Klage på avslag",
    "Søknad om forlengelse",
    "Opplysninger fra lege",
    "Egenmelding",
    "Skatteopplysninger",
    "Dokumentasjon av utgifter",
    "Søknad om unntak",
    "Uttalelse fra bruker",
  ],
  utgående: [
    "Vedtak om innvilgelse",
    "Vedtak om avslag",
    "Forhåndsvarsel om stans",
    "Brev om etterbetaling",
    "Innhenting av opplysninger",
    "Varsel om kontrollutredning",
    "Varsel om tilbakekreving",
    "Vedtak om tilbakekreving",
    "Orientering om rettigheter",
    "Svar på henvendelse",
  ],
  notat: [
    "Telefonnotat",
    "Referat fra møte",
    "Vurdering av arbeidsevne",
    "Notat fra oppfølging",
    "Internt notat",
    "Samtalereferat",
    "Vurdering av vilkår",
  ],
};

const avsendere = [
  "Bruker",
  "Fastlege",
  "Spesialisthelsetjenesten",
  "Arbeidsgiver",
  "NAV Arbeid og ytelser",
  "NAV Kontroll",
  "Advokat",
  "Skatteetaten",
  "Verge",
  "NAV Klageinstans",
];

const joarkBase = "https://joark.intern.nav.no/dokument";

let nesteId = 1000;

function lagJournalpostId(): string {
  return String(nesteId++);
}

function velgTilfeldig<T>(liste: T[], seed: number): T {
  return liste[seed % liste.length];
}

function lagDato(baseDato: Date, dagerTilbake: number): string {
  const dato = new Date(baseDato);
  dato.setDate(dato.getDate() - dagerTilbake);
  return dato.toISOString().split("T")[0];
}

function lagJournalposter(fødselsnummer: string): Journalpost[] {
  // Bruk fødselsnummeret som seed for å generere konsistente data
  const seed = Array.from(fødselsnummer).reduce((sum, tegn) => sum + tegn.charCodeAt(0), 0);

  // Varier antall poster mellom 0 og 35 basert på fødselsnummer
  const antall = seed % 36;
  if (antall === 0) return [];

  const baseDato = new Date("2026-03-10");
  const typer: Journalposttype[] = ["inngående", "utgående", "notat"];
  const poster: Journalpost[] = [];

  for (let i = 0; i < antall; i++) {
    const typeSeed = seed + i * 7;
    const type = velgTilfeldig(typer, typeSeed);
    const tittelListe = titler[type];

    poster.push({
      journalpostId: lagJournalpostId(),
      tittel: velgTilfeldig(tittelListe, typeSeed + 1),
      dato: lagDato(baseDato, i * 12 + (typeSeed % 10)),
      journalposttype: type,
      tema: velgTilfeldig(temaer, typeSeed + 2),
      avsenderMottaker: velgTilfeldig(avsendere, typeSeed + 3),
      dokumentUrl: `${joarkBase}/${lagJournalpostId()}`,
    });
  }

  // Sorter med nyeste først
  return poster.sort((a, b) => new Date(b.dato).getTime() - new Date(a.dato).getTime());
}

const journalpostCache = new Map<string, Journalpost[]>();

/** Hent journalposter fra Joark for et gitt fødselsnummer. */
export function hentJournalposter(fødselsnummer: string): Journalpost[] {
  if (!journalpostCache.has(fødselsnummer)) {
    journalpostCache.set(fødselsnummer, lagJournalposter(fødselsnummer));
  }
  return journalpostCache.get(fødselsnummer) ?? [];
}
