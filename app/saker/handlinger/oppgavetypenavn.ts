import type { Oppgavekodeverk } from "./oppgavekodeverk";
import { formaterOppgavetype } from "./opprett-formatering";

/**
 * Finner lesbart navn på en oppgavetype, f.eks. «Journalføring» for JFR.
 *
 * Bruker termen fra Gosys-kodeverket når det er hentet, ellers den statiske
 * reservelisten. Ukjente koder vises som de er.
 */
export function finnOppgavetypenavn(kode: string, kodeverk?: Oppgavekodeverk): string {
  const term = kodeverk?.oppgavetyper.find((type) => type.oppgavetype === kode)?.term;
  return term ?? formaterOppgavetype(kode);
}
