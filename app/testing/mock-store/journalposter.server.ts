import type { JournalpostReferanse } from "~/saker/filer/typer";
import type { MockState } from "./session.server";

export function hentJournalposterForSak(state: MockState, sakId: string): JournalpostReferanse[] {
  return state.journalposter.get(sakId) ?? [];
}

export function leggTilJournalpost(
  state: MockState,
  sakId: string,
  journalpost: JournalpostReferanse,
) {
  state.journalposter.set(sakId, [...hentJournalposterForSak(state, sakId), journalpost]);
}
