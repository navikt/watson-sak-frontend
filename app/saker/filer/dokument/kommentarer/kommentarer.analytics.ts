import { sporHendelse } from "~/analytics/analytics";
import type { Elementkategori } from "./anker";
import type { Ankertype } from "./typer";

/**
 * Typesikker analytics for dokumentkommentarer.
 *
 * Komponentene skal aldri sende hendelsesstrenger selv – de kaller funksjonene
 * her. Da er det ett sted å kontrollere at vi bare sender **lukkede** attributter.
 * Vi sender aldri fritekst, navn, sakId, docId, nav-ident eller dokumenttittel,
 * fordi Umami-hendelser ikke er et personvernsikkert sted for saksopplysninger.
 */

/** Hvor i grensesnittet handlingen ble startet. Lukket sett. */
export type Kommentarkilde =
  | "panel"
  | "tekstmarkering"
  | "element"
  | "tastatursnarvei"
  | "markering"
  | "url";

/** Hvilket filtervalg som ble endret. Lukket sett. */
export type Kommentarfilter = "vis_loste";

type Resultat = "feil" | "konflikt";

type Opprettingsdata = {
  ankertype: Ankertype;
  kilde: Kommentarkilde;
  elementtype?: Elementkategori;
};

function opprettingsattributter({ ankertype, kilde, elementtype }: Opprettingsdata) {
  return elementtype ? { ankertype, kilde, elementtype } : { ankertype, kilde };
}

export const kommentarAnalytics = {
  panelÅpnet(kilde: Kommentarkilde) {
    sporHendelse("kommentarpanel åpnet", { kilde });
  },
  opprettingStartet(data: Opprettingsdata) {
    sporHendelse("kommentar oppretting startet", opprettingsattributter(data));
  },
  opprettingAvbrutt(data: Opprettingsdata) {
    sporHendelse("kommentar oppretting avbrutt", opprettingsattributter(data));
  },
  opprettet(data: Opprettingsdata) {
    sporHendelse("kommentar opprettet", opprettingsattributter(data));
  },
  opprettingFeilet(data: Opprettingsdata & { resultat: Resultat }) {
    sporHendelse("kommentar oppretting feilet", {
      ...opprettingsattributter(data),
      resultat: data.resultat,
    });
  },
  svarOpprettet(ankertype: Ankertype) {
    sporHendelse("kommentarsvar opprettet", { ankertype });
  },
  svarFeilet(ankertype: Ankertype, resultat: Resultat) {
    sporHendelse("kommentarsvar feilet", { ankertype, resultat });
  },
  redigert(ankertype: Ankertype) {
    sporHendelse("kommentar redigert", { ankertype });
  },
  redigeringFeilet(ankertype: Ankertype, resultat: Resultat) {
    sporHendelse("kommentar redigering feilet", { ankertype, resultat });
  },
  slettet(ankertype: Ankertype) {
    sporHendelse("kommentar slettet", { ankertype });
  },
  slettingFeilet(ankertype: Ankertype, resultat: Resultat) {
    sporHendelse("kommentar sletting feilet", { ankertype, resultat });
  },
  adressert(ankertype: Ankertype) {
    sporHendelse("kommentartråd løst", { ankertype });
  },
  gjenåpnet(ankertype: Ankertype) {
    sporHendelse("kommentartråd gjenåpnet", { ankertype });
  },
  adresseringFeilet(ankertype: Ankertype, handling: "løs" | "gjenåpne", resultat: Resultat) {
    sporHendelse("kommentartråd status feilet", { ankertype, handling, resultat });
  },
  ankernavigasjon(ankertype: Ankertype, handling: "til_anker" | "til_traad") {
    sporHendelse("kommentar ankernavigasjon", { ankertype, handling });
  },
  filterBrukt(filter: Kommentarfilter, handling: "på" | "av") {
    sporHendelse("kommentarfilter brukt", { filter, handling });
  },
};
