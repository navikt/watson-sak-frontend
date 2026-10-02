import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import {
  lagreDokument as lagreMockDokument,
  opprettDokument as opprettMockDokument,
} from "~/saker/filer/mock-data.server";
import { lagreDokument, opprettDokument } from "~/saker/api.server";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { logger } from "~/logging/logging";

const NOTAT_FRA_OPPRETTELSE_TITTEL = "Notat fra opprettelse";

/**
 * Bygger et minimalt Plate/Slate-dokument med notatteksten som ett avsnitt.
 * Samme node-form («type: p», «children: [{ text }]») som backendens tomme
 * dokument og malbyggerne i `saker/filer/dokument/maler/`.
 */
function byggNotatInnhold(tekst: string): DokumentInnhold {
  return [{ type: "p", children: [{ text: tekst }] }];
}

/**
 * Oppretter et vanlig dokument på saken med notatteksten, gjenbruker
 * eksisterende dokument-API (samme som mal-innhold ved "Opprett dokument").
 * Kalles direkte — ikke via den steg-sperrede `/api/saker/:sakId/dokumenter`
 * resource-routen — slik at den fungerer selv om saken står i steget
 * OPPRETTET. Bakenforliggende tilgangskontroll (`DokumentTilgangService`)
 * krever likevel at innlogget bruker er sakens ansvarlig eller delt med.
 *
 * Kaster ved feil. Kalleren avgjør hva som skal skje med saken og
 * brukervisningen (se `RegistrerSakSide.server.ts` og `notat.api.ts`).
 */
export async function lagreNotatFraOpprettelse(
  request: Request,
  sakId: string,
  notatTekst: string,
): Promise<void> {
  const innhold = byggNotatInnhold(notatTekst);

  if (skalBrukeMockdata) {
    const innlogget = await hentInnloggetBruker({ request });
    const { id } = opprettMockDokument(request, sakId, innlogget.name);
    lagreMockDokument(request, sakId, id, {
      tittel: NOTAT_FRA_OPPRETTELSE_TITTEL,
      innhold,
      endretAv: innlogget.name,
    });
    return;
  }

  const token = await getBackendOboToken(request);
  const opprettet = await opprettDokument(token, sakId);
  await lagreDokument(token, sakId, opprettet.id, {
    tittel: NOTAT_FRA_OPPRETTELSE_TITTEL,
    innhold,
    opprettHistorikk: true,
  });
}

/**
 * Samme som {@link lagreNotatFraOpprettelse}, men fanger feil og logger dem
 * i stedet for å kaste. Brukes ved sakopprettelse: saken skal beholdes selv
 * om notatet ikke kan lagres — se § «Lokal flyt med lagret migreringsstatus»
 * i `docs/plans/migrering-avklaringer.md`.
 *
 * @returns `true` hvis notatet ble lagret, `false` ved feil.
 */
export async function lagreNotatFraOpprettelseTrygt(
  request: Request,
  sakId: string,
  notatTekst: string,
): Promise<boolean> {
  try {
    await lagreNotatFraOpprettelse(request, sakId, notatTekst);
    return true;
  } catch (err) {
    logger.error("Kunne ikke lagre notat ved opprettelse av kontrollsak fra migrering", {
      sakId,
      err,
    });
    return false;
  }
}
