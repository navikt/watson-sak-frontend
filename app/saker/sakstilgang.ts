import type { KontrollsakResponse } from "~/saker/types.backend";
import { erSakseier } from "./handlinger/tilgjengeligeHandlinger";

type Innlogget = { navIdent: string; erLeder: boolean };

/**
 * Direkte tilgang til saken: eier, delt med eller leder. Kreves for å endre filområdet.
 * Tilgang via kontrollobjekt eller koblet sak regnes ikke med.
 */
export function harDirekteSakstilgang(sak: KontrollsakResponse, innlogget: Innlogget): boolean {
  return (
    erSakseier(sak, innlogget.navIdent) ||
    sak.saksbehandlere.deltMed.some((s) => s.navIdent === innlogget.navIdent) ||
    innlogget.erLeder
  );
}

/**
 * Lesetilgang til arkiv, filer og historikk. Backend fjerner eier og delt-med når saken
 * avsluttes, og gir da lesetilgang til alle med tilgang til personen. Persontilgangen
 * håndheves av backend, så frontend slipper avsluttede saker gjennom her.
 */
export function kanLeseSaksinnhold(sak: KontrollsakResponse, innlogget: Innlogget): boolean {
  return harDirekteSakstilgang(sak, innlogget) || sak.steg === "AVSLUTTET";
}
