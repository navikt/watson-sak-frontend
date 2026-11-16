import type {
  Henleggelsesnotat,
  Henleggelsesnotattype,
  HenleggelsesnotatResultat,
  RegistrertHenleggelsesnotat,
} from "~/saker/types.backend";
import type { MockState } from "./session.server";

export function hentHenleggelsesnotaterForSak(
  state: MockState,
  sakId: string,
): RegistrertHenleggelsesnotat[] {
  return state.henleggelsesnotater.get(sakId) ?? [];
}

/**
 * Etterligner backend: tekst gir journalføring, uten tekst registreres notatet uten journalpost,
 * og et notat som allerede er journalført, journalføres ikke på nytt.
 * `feiledeTyper` simulerer at journalføringen feiler for de gitte typene.
 */
export function registrerHenleggelsesnotater(
  state: MockState,
  sakId: string,
  notater: Henleggelsesnotat[],
  feiledeTyper: Henleggelsesnotattype[] = [],
): HenleggelsesnotatResultat[] {
  const registrerte = [...hentHenleggelsesnotaterForSak(state, sakId)];
  const resultater = notater.map((notat): HenleggelsesnotatResultat => {
    const eksisterende = registrerte.find((r) => r.notattype === notat.notattype);
    if (eksisterende?.journalpostId) {
      return {
        notattype: notat.notattype,
        utfall: "ALLEREDE_JOURNALFORT",
        journalpostId: eksisterende.journalpostId,
      };
    }
    if (feiledeTyper.includes(notat.notattype)) {
      return { notattype: notat.notattype, utfall: "FEILET", journalpostId: null };
    }
    const harTekst = !!notat.tekst?.trim();
    const journalpostId = harTekst ? `mock-jp-${sakId}-${notat.notattype}` : null;
    const registrert: RegistrertHenleggelsesnotat = {
      notattype: notat.notattype,
      journalpostId,
      registrertTidspunkt: new Date().toISOString(),
    };
    const indeks = registrerte.findIndex((r) => r.notattype === notat.notattype);
    if (indeks >= 0) registrerte[indeks] = registrert;
    else registrerte.push(registrert);
    return {
      notattype: notat.notattype,
      utfall: harTekst ? "JOURNALFORT" : "REGISTRERT_UTEN_TEKST",
      journalpostId,
    };
  });
  state.henleggelsesnotater.set(sakId, registrerte);
  return resultater;
}
