/**
 * Alle feilmeldingstekster for tekniske feil ved innsending (TH-90), på ett sted.
 * Numrene viser til oversikten designerne har godkjent (th-90-feilmeldinger, versjon 3).
 *
 * - `feilet`: baksystemet svarte med feil. Endringen er rullet tilbake og ble ikke lagret.
 * - `usikker`: vi fikk ikke svar. Endringen kan være lagret, så brukeren må sjekke før nytt forsøk.
 *
 * Meldinger med bare én tekst gjelder handlinger der et nytt forsøk ikke gir dobbel lagring,
 * eller der designerne har valgt én tekst for begge situasjonene.
 */

export type Feilmeldingstekst = { tittel: string; tekst: string };
export type Innsendingstekster =
  | Feilmeldingstekst
  | { feilet: Feilmeldingstekst; usikker: Feilmeldingstekst };

const PRØV = "Prøv igjen om litt.";

const varianter = (feilet: [string, string], usikker: [string, string]): Innsendingstekster => ({
  feilet: { tittel: feilet[0], tekst: feilet[1] },
  usikker: { tittel: usikker[0], tekst: usikker[1] },
});

export const INNSENDINGSFEIL = {
  /** 7a */
  endreSteg: varianter(
    ["Vi fikk ikke endret steget", PRØV],
    [
      "Vi vet ikke om steget ble endret",
      "Last inn siden og se hvilket steg saken står i før du prøver igjen.",
    ],
  ),
  /** 7b */
  endreStatus: varianter(
    ["Vi fikk ikke endret statusen", PRØV],
    ["Vi vet ikke om statusen ble endret", "Last inn siden og se statusen før du prøver igjen."],
  ),
  /** 7c */
  lagreResultat: varianter(
    ["Vi fikk ikke lagret resultatet", PRØV],
    [
      "Vi vet ikke om resultatet ble lagret",
      "Last inn siden og se om resultatet er registrert før du prøver igjen.",
    ],
  ),
  /** 8 */
  saksinformasjon: varianter(
    ["Vi fikk ikke lagret saksinformasjonen", PRØV],
    [
      "Vi vet ikke om saksinformasjonen ble lagret",
      "Last inn siden og se om endringene er med før du prøver igjen.",
    ],
  ),
  /** 9a */
  kobleSaker: varianter(
    ["Vi fikk ikke koblet sakene", PRØV],
    [
      "Vi vet ikke om sakene ble koblet",
      "Last inn siden og se om sakene står som koblet før du prøver igjen.",
    ],
  ),
  /** 9b */
  fjerneKobling: varianter(
    ["Vi fikk ikke fjernet koblingen", PRØV],
    [
      "Vi vet ikke om koblingen ble fjernet",
      "Last inn siden og se om sakene fortsatt er koblet før du prøver igjen.",
    ],
  ),
  /** 10 */
  tildelMeg: varianter(
    ["Vi fikk ikke tildelt deg saken", PRØV],
    [
      "Vi vet ikke om saken ble tildelt deg",
      "Last inn siden og se hvem som er saksbehandler før du prøver igjen.",
    ],
  ),
  /** 11 */
  fristill: varianter(
    ["Vi fikk ikke fristilt saken", PRØV],
    [
      "Vi vet ikke om saken ble fristilt",
      "Last inn siden og se hvem som er saksbehandler før du prøver igjen.",
    ],
  ),
  /** 12 */
  overførAnsvar: varianter(
    ["Vi fikk ikke overført saken", PRØV],
    [
      "Vi vet ikke om saken ble overført",
      "Last inn siden og se hvem som er ansvarlig før du prøver igjen.",
    ],
  ),
  /** 13 */
  sendTilEnhet: varianter(
    ["Vi fikk ikke sendt saken til enheten", PRØV],
    [
      "Vi vet ikke om saken ble sendt",
      "Last inn siden og se hvilken enhet saken står på før du prøver igjen.",
    ],
  ),
  /** 14 */
  delTilgang: varianter(
    ["Vi fikk ikke delt tilgangen", PRØV],
    [
      "Vi vet ikke om tilgangen ble delt",
      "Last inn siden og se hvem saken er delt med før du prøver igjen.",
    ],
  ),
  /** 15 */
  nyHendelse: varianter(
    ["Vi fikk ikke lagret hendelsen", PRØV],
    [
      "Vi vet ikke om hendelsen ble lagret",
      "Se i historikken før du prøver igjen, så hendelsen ikke kommer med to ganger.",
    ],
  ),
  /** 16 */
  redigerHendelse: varianter(
    ["Vi fikk ikke lagret endringene i hendelsen", PRØV],
    ["Vi vet ikke om endringene i hendelsen ble lagret", "Se i historikken før du prøver igjen."],
  ),
  /** 17 */
  endreFilnavn: varianter(
    ["Vi fikk ikke endret filnavnet", PRØV],
    ["Vi vet ikke om filnavnet ble endret", "Se i fillisten før du prøver igjen."],
  ),
  /** 18 */
  slettHendelse: varianter(
    ["Vi fikk ikke slettet hendelsen", PRØV],
    [
      "Vi vet ikke om hendelsen ble slettet",
      "Last inn siden og se om hendelsen fortsatt står i historikken.",
    ],
  ),
  /** 19 */
  fjernTilgang: varianter(
    ["Vi fikk ikke fjernet tilgangen", PRØV],
    [
      "Vi vet ikke om tilgangen ble fjernet",
      "Last inn siden og se hvem saken er delt med før du prøver igjen.",
    ],
  ),
  /** 20 */
  ferdigFlyttet: { tittel: "Vi fikk ikke merket saken som ferdig flyttet", tekst: PRØV },
  /** 21a */
  opprettMappe: varianter(
    ["Vi fikk ikke opprettet mappen", PRØV],
    ["Vi vet ikke om mappen ble opprettet", "Se i fillisten før du prøver igjen."],
  ),
  /** 21b */
  giMappeNyttNavn: varianter(
    ["Vi fikk ikke endret navnet på mappen", PRØV],
    ["Vi vet ikke om mappen fikk nytt navn", "Se i fillisten før du prøver igjen."],
  ),
  /** 21c */
  slettMappe: varianter(
    ["Vi fikk ikke slettet mappen", PRØV],
    ["Vi vet ikke om mappen ble slettet", "Se i fillisten før du prøver igjen."],
  ),
  /** 24 */
  lastOppFil: varianter(
    ["Vi fikk ikke lastet opp filen", PRØV],
    ["Vi vet ikke om filen ble lastet opp", "Se i fillisten før du prøver igjen."],
  ),
  /** 25 */
  slettFil: varianter(
    ["Vi fikk ikke slettet filen", PRØV],
    ["Vi vet ikke om filen ble slettet", "Se i fillisten før du prøver igjen."],
  ),
  /** 26 */
  opprettDokument: { tittel: "Vi fikk ikke opprettet dokumentet", tekst: PRØV },
  /** 27 */
  slettDokument: varianter(
    ["Vi fikk ikke slettet dokumentet", PRØV],
    ["Vi vet ikke om dokumentet ble slettet", "Se i dokumentlisten før du prøver igjen."],
  ),
  /** 28. Vises av editoren med egen «Prøv igjen»-knapp, også ved nettverksbrudd. */
  lagreDokument: {
    tittel: "Vi fikk ikke lagret dokumentet",
    tekst: "Sjekk at du er på nett, og prøv å lagre på nytt om litt.",
  },
  /** 29 og 30 */
  lagreKommentar: { tittel: "Vi fikk ikke lagret kommentaren", tekst: PRØV },
  /** 31 */
  slettKommentar: varianter(
    ["Vi fikk ikke slettet kommentaren", PRØV],
    [
      "Vi vet ikke om kommentaren ble slettet",
      "Last inn siden og se om kommentaren fortsatt vises.",
    ],
  ),
  /** 32 */
  løsKommentar: { tittel: "Vi fikk ikke markert kommentaren som løst", tekst: PRØV },
  /** 33 */
  gjenåpneKommentar: { tittel: "Vi fikk ikke gjenåpnet kommentaren", tekst: PRØV },
  /** 34 */
  registrerSak: varianter(
    ["Vi fikk ikke registrert saken", PRØV],
    [
      "Vi vet ikke om saken ble registrert",
      "Se i Mine saker før du prøver igjen, så saken ikke blir registrert to ganger.",
    ],
  ),
  /** 35 */
  slåOppPerson: {
    tittel: "Vi fikk ikke hentet opplysninger om personen",
    tekst: "Prøv å søke på nytt om litt.",
  },
  /** 36 */
  fordelSak: varianter(
    ["Vi fikk ikke fordelt saken", PRØV],
    [
      "Vi vet ikke om saken ble fordelt",
      "Last inn siden og se om saken fortsatt står i listen før du prøver igjen.",
    ],
  ),
  /** 37 */
  tildelMigrering: varianter(
    ["Vi fikk ikke tildelt saken", PRØV],
    [
      "Vi vet ikke om saken ble tildelt",
      "Last inn siden og se hvem saken står på før du prøver igjen.",
    ],
  ),
  /** 38 */
  søk: { tittel: "Vi fikk ikke søkt", tekst: PRØV },
  /** 39 */
  merkVarslerLest: { tittel: "Vi fikk ikke markert varslene som lest", tekst: PRØV },
} satisfies Record<string, Innsendingstekster>;

/** 22 og 23. Navnet på fila eller mappa står i tittelen. Det kommer fra brukeren og logges aldri. */
export function flytteFeil(navn: string): Innsendingstekster {
  return varianter(
    [`Vi fikk ikke flyttet «${navn}»`, PRØV],
    [`Vi vet ikke om «${navn}» ble flyttet`, "Se i listen før du prøver igjen."],
  );
}

/** Velger riktig tekst ut fra om vi vet at endringen ikke ble lagret. */
export function velgTekst(tekster: Innsendingstekster, usikker: boolean): Feilmeldingstekst {
  if ("feilet" in tekster) return usikker ? tekster.usikker : tekster.feilet;
  return tekster;
}
