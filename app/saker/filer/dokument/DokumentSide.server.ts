import { data, isRouteErrorResponse } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env, skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import type { DokumentInnhold } from "~/saker/filer/typer";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import {
  hentDokument,
  hentDokumentHistorikk,
  hentDokumenttreForSak,
  lagreDokument,
  opprettEllerOppdaterDokumentHistorikk,
} from "../mock-data.server";
import { hentStegbaserteSaksregler } from "../../stegregler";
import { getSaksenhet } from "~/saker/selectors";
import { hentKommentarliste as hentKommentarlisteFraBackend } from "./kommentarer/kommentarer.api.server";
import { hentKommentarliste as hentKommentarlisteFraMock } from "./kommentarer/mock-data.server";
import { logger } from "~/logging/logging";
import type { Kommentarliste } from "./kommentarer/typer";
import type { Route } from "./+types/DokumentSide.route";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { VariabelVerdier } from "./variabler/variabel-typer";

function byggVariabelVerdier(
  sak: KontrollsakResponse,
  innlogget: Awaited<ReturnType<typeof hentInnloggetBruker>>,
): VariabelVerdier {
  return {
    navn: sak.personNavn,
    fødselsnummer: sak.personIdent,
    saksnummer: `Sak ${sak.id}`,
    saksbehandler: innlogget.name,
    // "Avdeling" er enheten registrert på saken, ikke saksbehandlerens egen enhet —
    // de er ofte like, men saken kan være overført til/fra en annen enhet.
    avdeling: getSaksenhet(sak) || undefined,
  };
}

function erUtloggetFeil(feil: unknown): boolean {
  if (isRouteErrorResponse(feil)) return feil.status === 401;
  if (feil instanceof Response) return feil.status === 401;
  if (!feil || typeof feil !== "object" || !("init" in feil)) return false;
  const init = feil.init;
  return !!init && typeof init === "object" && "status" in init && init.status === 401;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!skalBrukeMockdata) {
    const sakReferanse = params.sakId;
    const docId = params.docId;
    if (!sakReferanse || !docId) {
      throw data("Mangler sak eller dokument", { status: 400 });
    }

    const token = await getBackendOboToken(request);
    // Kommentarene hentes parallelt med dokument og historikk, slik at panelet er
    // fylt allerede ved første render. Feiler kommentarkallet, vil vi fortsatt vise
    // dokumentet – kommentarer skal ikke kunne blokkere saksbehandlingen.
    const [sak, dokument, innlogget, dokumentHistorikk, kommentarresultat] = await Promise.all([
      backendApi.hentKontrollsak(token, sakReferanse),
      backendApi.hentDokument(token, sakReferanse, docId),
      hentInnloggetBruker({ request }),
      backendApi.hentDokumentHistorikk(token, sakReferanse, docId),
      hentKommentarlisteFraBackend(token, sakReferanse, docId)
        .then((liste) => ({ liste, feilet: false }))
        .catch((feil: unknown): { liste: Kommentarliste | null; feilet: true } => {
          if (erUtloggetFeil(feil)) throw feil;
          logger.warn(`Kunne ikke hente kommentarer for dokument ${docId}`, {
            feil: String(feil),
          });
          return { liste: null, feilet: true };
        }),
    ]);

    const kanSe =
      sak.saksbehandlere.eier?.navIdent === innlogget.navIdent ||
      sak.saksbehandlere.deltMed.some(
        (saksbehandler) => saksbehandler.navIdent === innlogget.navIdent,
      );

    if (!kanSe) {
      throw data("Ingen tilgang til denne saken", { status: 403 });
    }

    return {
      dokument,
      dokumenter: sak.dokumenter ?? [],
      dokumentHistorikk: dokumentHistorikk.items,
      // Kommenterbarhet er backendens fasit (`kanKommentere` i GET-wrapperen).
      // Falt kallet ut, viser vi et skrivebeskyttet panel med tydelig retry.
      kommentarliste:
        kommentarresultat.liste ??
        ({
          dokumentId: docId,
          arkivert: dokument.arkivert ?? null,
          kanKommentere: false,
          traader: [],
        } satisfies Kommentarliste),
      kommentarinnlastingFeilet: kommentarresultat.feilet,
      sakReferanse,
      kanRedigere:
        kanSe && hentStegbaserteSaksregler(sak.steg).kanRedigereDokumenter && !dokument.arkivert,
      variabelVerdier: byggVariabelVerdier(sak, innlogget),
      miljø: env.ENVIRONMENT,
    };
  }

  const tilgang = await hentSakstilgangFraMock(request, params.sakId);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!tilgang.kanSe) {
    throw data("Ingen tilgang til denne saken", { status: 403 });
  }

  const [dokument, innlogget] = await Promise.all([
    hentDokument(request, String(tilgang.sak.id), params.docId),
    hentInnloggetBruker({ request }),
  ]);
  if (!dokument) {
    throw data("Dokument ikke funnet", { status: 404 });
  }

  return {
    dokument,
    dokumenter: hentDokumenttreForSak(request, String(tilgang.sak.id)),
    dokumentHistorikk: hentDokumentHistorikk(request, String(tilgang.sak.id), params.docId),
    kommentarliste: hentKommentarlisteFraMock(request, String(tilgang.sak.id), params.docId, {
      innloggetIdent: innlogget.navIdent,
      arkivert: dokument.arkivert ?? null,
    }),
    kommentarinnlastingFeilet: false,
    sakReferanse: params.sakId,
    kanRedigere: tilgang.kanRedigereDokumenter && !dokument.arkivert,
    variabelVerdier: byggVariabelVerdier(tilgang.sak, innlogget),
    miljø: env.ENVIRONMENT,
  };
}

function normaliserTittel(verdi: unknown): string {
  if (typeof verdi !== "string") {
    return "Uten tittel";
  }
  const trimmet = verdi.trim();
  return trimmet.length > 0 ? trimmet : "Uten tittel";
}

function erGyldigInnhold(verdi: unknown): verdi is DokumentInnhold {
  return (
    Array.isArray(verdi) &&
    verdi.length > 0 &&
    verdi.every((node) => node !== null && typeof node === "object" && !Array.isArray(node))
  );
}

export async function action({ request, params }: Route.ActionArgs) {
  const sakReferanse = params.sakId;
  const docId = params.docId;
  if (!sakReferanse || !docId) {
    throw data("Mangler sak eller dokument", { status: 400 });
  }

  if (!skalBrukeMockdata) {
    if (request.method !== "PUT") {
      throw data("Metoden støttes ikke", { status: 405 });
    }

    const token = await getBackendOboToken(request);
    const sak = await backendApi.hentKontrollsak(token, sakReferanse);
    if (!hentStegbaserteSaksregler(sak.steg).kanRedigereDokumenter) {
      throw data("Dokumenter kan ikke redigeres før saken er satt til Utredes", { status: 403 });
    }
    let kropp: { tittel?: unknown; innhold?: unknown; opprettHistorikk?: unknown };
    try {
      kropp = (await request.json()) as { tittel?: unknown; innhold?: unknown };
    } catch {
      throw data("Ugyldig JSON i forespørselen", { status: 400 });
    }
    if (!erGyldigInnhold(kropp.innhold)) {
      throw data("Ugyldig dokumentinnhold", { status: 400 });
    }

    const oppdatert = await backendApi.lagreDokument(token, sakReferanse, docId, {
      tittel: normaliserTittel(kropp.tittel),
      innhold: kropp.innhold,
      opprettHistorikk: kropp.opprettHistorikk === true,
    });

    return { ok: true as const, tittel: oppdatert.tittel, endretDato: oppdatert.endretDato };
  }
  if (request.method !== "PUT") {
    throw data("Metoden støttes ikke", { status: 405 });
  }

  const tilgang = await hentSakstilgangFraMock(request, params.sakId);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!tilgang.kanRedigereDokumenter) {
    throw data("Ingen tilgang til å redigere dokumentet", { status: 403 });
  }

  let kropp: { tittel?: unknown; innhold?: unknown; opprettHistorikk?: unknown };
  try {
    kropp = (await request.json()) as { tittel?: unknown; innhold?: unknown };
  } catch {
    throw data("Ugyldig JSON i forespørselen", { status: 400 });
  }
  if (!erGyldigInnhold(kropp.innhold)) {
    throw data("Ugyldig dokumentinnhold", { status: 400 });
  }

  const innlogget = await hentInnloggetBruker({ request });
  const oppdatert = lagreDokument(request, String(tilgang.sak.id), params.docId, {
    tittel: normaliserTittel(kropp.tittel),
    innhold: kropp.innhold,
    endretAv: innlogget.name,
  });

  if (!oppdatert) {
    throw data("Dokument ikke funnet", { status: 404 });
  }
  if (kropp.opprettHistorikk === true) {
    opprettEllerOppdaterDokumentHistorikk(request, String(tilgang.sak.id), docId, innlogget.name);
  }

  return { ok: true as const, tittel: oppdatert.tittel, endretDato: oppdatert.endretDato };
}
