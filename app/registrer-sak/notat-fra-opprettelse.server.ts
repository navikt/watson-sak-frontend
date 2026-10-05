import { data } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { getBackendOboToken } from "~/auth/access-token";
import { erUtloggetFeil } from "~/auth/session-utløpt.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentMigreringskandidat } from "~/migrering/api.server";
import {
  hentDokumenttreForSak as hentMockDokumenttre,
  lagreDokument as lagreMockDokument,
  opprettDokument as opprettMockDokument,
  slettDokument as slettMockDokument,
} from "~/saker/filer/mock-data.server";
import { hentKontrollsak, lagreDokument, opprettDokument, slettDokument } from "~/saker/api.server";
import { erSakseier } from "~/saker/handlinger/tilgjengeligeHandlinger";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
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
 * Sjekker at `sakId` er innlogget brukers egen migreringssak som fortsatt står
 * som `UNDER_MIGRERING`, før retry-ruten får lagre et notat. Uten dette kunne en
 * klientstyrt `sakId` brukes til å legge notater på vilkårlige saker og omgå
 * stegsperren i dokument-API-et.
 *
 * Kaster `data()` med 403 eller 404. En utløpt sesjon (401) bevares.
 */
export async function kreverEgenMigreringssak(request: Request, sakId: string): Promise<void> {
  const innlogget = await hentInnloggetBruker({ request });
  const ikkeTilgang = () =>
    data("Notatet kan bare lagres på din egen migreringssak.", { status: 403 });

  if (skalBrukeMockdata) {
    const sak = hentAlleSaker(request).find((kandidat) => String(kandidat.id) === sakId);
    if (!sak) throw data("Fant ikke saken.", { status: 404 });
    if (
      !sak.legacyKilde ||
      !sak.legacyPid ||
      sak.saksbehandlere.eier?.navIdent !== innlogget.navIdent
    ) {
      throw ikkeTilgang();
    }
    return;
  }

  const token = await getBackendOboToken(request);
  let sak;
  try {
    sak = await hentKontrollsak(token, sakId);
  } catch (feil) {
    if (erUtloggetFeil(feil)) throw feil;
    throw data("Fant ikke saken.", { status: 404 });
  }
  if (!sak.legacyKilde || !sak.legacyPid || !erSakseier(sak, innlogget.navIdent)) {
    throw ikkeTilgang();
  }

  let kandidat;
  try {
    kandidat = await hentMigreringskandidat(request, `${sak.legacyKilde}:${sak.legacyPid}`);
  } catch (feil) {
    if (erUtloggetFeil(feil)) throw feil;
    throw ikkeTilgang();
  }
  if (
    kandidat.alleredeMigrertTilKontrollsakId !== sak.id ||
    kandidat.migreringsstatus !== "UNDER_MIGRERING"
  ) {
    throw ikkeTilgang();
  }
}

/**
 * Oppretter et vanlig dokument på saken med notatteksten, gjenbruker
 * eksisterende dokument-API (samme som mal-innhold ved "Opprett dokument").
 * Kalles direkte — ikke via den steg-sperrede `/api/saker/:sakId/dokumenter`
 * resource-routen — slik at den fungerer selv om saken står i steget
 * OPPRETTET. Bakenforliggende tilgangskontroll (`DokumentTilgangService`)
 * krever likevel at innlogget bruker er sakens ansvarlig eller delt med.
 *
 * Idempotent ved retry (`gjenbrukEksisterende`): finnes det allerede et
 * dokument med notattittelen, oppdateres det i stedet for å opprette et nytt.
 * Feiler lagringen etter at et nytt dokument er opprettet, slettes det tomme
 * dokumentet igjen, så retry ikke etterlater «Uten tittel»-dokumenter.
 *
 * Kaster ved feil. Kalleren avgjør hva som skal skje med saken og
 * brukervisningen (se `RegistrerSakSide.server.ts` og `notat.api.ts`).
 */
export async function lagreNotatFraOpprettelse(
  request: Request,
  sakId: string,
  notatTekst: string,
  { gjenbrukEksisterende = false }: { gjenbrukEksisterende?: boolean } = {},
): Promise<void> {
  const innhold = byggNotatInnhold(notatTekst);

  if (skalBrukeMockdata) {
    const innlogget = await hentInnloggetBruker({ request });
    const eksisterende = gjenbrukEksisterende
      ? hentMockDokumenttre(request, sakId).find(
          (dokument) => dokument.tittel === NOTAT_FRA_OPPRETTELSE_TITTEL && !dokument.arkivert,
        )
      : undefined;
    const docId = eksisterende?.id ?? opprettMockDokument(request, sakId, innlogget.name).id;
    try {
      lagreMockDokument(request, sakId, docId, {
        tittel: NOTAT_FRA_OPPRETTELSE_TITTEL,
        innhold,
        endretAv: innlogget.name,
      });
    } catch (feil) {
      if (!eksisterende) slettMockDokument(request, sakId, docId);
      throw feil;
    }
    return;
  }

  const token = await getBackendOboToken(request);
  const eksisterende = gjenbrukEksisterende
    ? (await hentKontrollsak(token, sakId)).dokumenter.find(
        (dokument) => dokument.tittel === NOTAT_FRA_OPPRETTELSE_TITTEL && !dokument.arkivert,
      )
    : undefined;
  const docId = eksisterende?.id ?? (await opprettDokument(token, sakId)).id;
  try {
    await lagreDokument(token, sakId, docId, {
      tittel: NOTAT_FRA_OPPRETTELSE_TITTEL,
      innhold,
      opprettHistorikk: true,
    });
  } catch (feil) {
    if (!eksisterende) {
      await slettDokument(token, sakId, docId).catch((slettFeil) =>
        logger.error("Kunne ikke rydde bort tomt notatdokument etter mislykket lagring", {
          sakId,
          slettFeil,
        }),
      );
    }
    throw feil;
  }
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
