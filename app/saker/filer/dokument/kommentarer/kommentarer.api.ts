import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { z } from "zod";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { hentSakstilgangFraMock } from "~/saker/tilgang.server";
import { hentDokument } from "../../mock-data.server";
import * as kommentarApi from "./kommentarer.api.server";
import { KommentarBackendFeil, KommentarKonfliktFeil } from "./kommentarer.api.server";
import {
  hentKommentarliste,
  opprettKommentar,
  opprettKommentartraad,
  redigerKommentar,
  settAdressering,
  slettKommentar,
} from "./mock-data.server";
import {
  ankertypeSchema,
  fraBackendAnker,
  normaliserKommentartekst,
  type Kommentarliste,
} from "./typer";

/**
 * BFF for dokumentkommentarer.
 *
 * - `GET` returnerer hele `KommentarTraadListeResponse`-wrapperen, inkludert
 *   backendens `kanKommentere` og `arkivert`. Klienten skal aldri regne ut
 *   kommenterbarhet selv.
 * - `POST` utfører alle mutasjoner, styrt av feltet `handling`. Ett validert
 *   inngangspunkt gir enklere feilhåndtering enn fem HTTP-metoder gjennom
 *   React Routers resource routes.
 *
 * Statuskoder speiler backend: 400 ugyldig input, 403 manglende tilgang eller
 * forsøk på å endre en annens kommentar, 404 ukjent ressurs og **409** for
 * utdatert versjon, adressert tråd og arkivert dokument.
 */

const uuid = z.string().uuid();

const opprettTraadSchema = z.object({
  handling: z.literal("opprett_traad"),
  traadId: uuid,
  kommentarId: uuid,
  ankerType: ankertypeSchema,
  anker: z.unknown(),
  opprinneligSitat: z.string().max(2000).nullish(),
  tekst: z.unknown(),
});

const opprettKommentarSchema = z.object({
  handling: z.literal("opprett_kommentar"),
  traadId: uuid,
  kommentarId: uuid,
  tekst: z.unknown(),
  traadVersjon: z.number().int().nonnegative(),
});

const redigerKommentarSchema = z.object({
  handling: z.literal("rediger_kommentar"),
  kommentarId: uuid,
  tekst: z.unknown(),
  versjon: z.number().int().nonnegative(),
});

const slettKommentarSchema = z.object({
  handling: z.literal("slett_kommentar"),
  kommentarId: uuid,
  versjon: z.number().int().nonnegative(),
});

const adresseringSchema = z.object({
  handling: z.literal("sett_adressering"),
  traadId: uuid,
  adressert: z.boolean(),
  versjon: z.number().int().nonnegative(),
});

const kommentarhandlingSchema = z.discriminatedUnion("handling", [
  opprettTraadSchema,
  opprettKommentarSchema,
  redigerKommentarSchema,
  slettKommentarSchema,
  adresseringSchema,
]);

function krevParametre(params: { sakId?: string; docId?: string }) {
  if (!params.sakId || !params.docId) {
    throw data("Mangler sak eller dokument", { status: 400 });
  }
  return { sakReferanse: params.sakId, docId: params.docId };
}

/**
 * 409 fra backend bærer ikke den ferske tråden (ProblemDetail har bare
 * `detail` + versjonsfelter). Klienten beholder derfor utkastet sitt og henter
 * kommentarlisten på nytt selv.
 */
function konfliktsvar(melding: string) {
  return Response.json({ ok: false as const, feil: "konflikt" as const, melding }, { status: 409 });
}

/**
 * Kommentering krever bare **lesetilgang**: en saksbehandler skal kunne kommentere
 * selv om dokumentet er låst eller saken er avsluttet. Det eneste som blokkerer
 * mutasjoner er at dokumentet er arkivert – og det gir 409, ikke 403.
 */
async function krevLesetilgangIMock(request: Request, sakReferanse: string, docId: string) {
  const tilgang = await hentSakstilgangFraMock(request, sakReferanse);
  if (!tilgang) throw data("Sak ikke funnet", { status: 404 });
  if (!tilgang.kanSe) throw data("Ingen tilgang til denne saken", { status: 403 });

  const sakId = String(tilgang.sak.id);
  const dokument = await hentDokument(request, sakId, docId);
  if (!dokument) throw data("Dokument ikke funnet", { status: 404 });

  return { sakId, arkivert: dokument.arkivert ?? null };
}

async function krevLesetilgangIBackend(request: Request, sakReferanse: string) {
  const token = await getBackendOboToken(request);
  const [sak, innlogget] = await Promise.all([
    backendApi.hentKontrollsak(token, sakReferanse),
    hentInnloggetBruker({ request }),
  ]);

  const kanSe =
    sak.saksbehandlere.eier?.navIdent === innlogget.navIdent ||
    sak.saksbehandlere.deltMed.some(
      (saksbehandler) => saksbehandler.navIdent === innlogget.navIdent,
    );
  if (!kanSe) throw data("Ingen tilgang til denne saken", { status: 403 });

  return { token };
}

function håndterBackendfeil(feil: unknown): never {
  if (feil instanceof KommentarBackendFeil && feil.status < 500) {
    throw data(feil.message, { status: feil.status });
  }
  throw feil;
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { sakReferanse, docId } = krevParametre(params);

  if (!skalBrukeMockdata) {
    const { token } = await krevLesetilgangIBackend(request, sakReferanse);
    try {
      const liste: Kommentarliste = await kommentarApi.hentKommentarliste(
        token,
        sakReferanse,
        docId,
      );
      return Response.json(liste);
    } catch (feil) {
      håndterBackendfeil(feil);
    }
  }

  const { sakId, arkivert } = await krevLesetilgangIMock(request, sakReferanse, docId);
  const innlogget = await hentInnloggetBruker({ request });
  return Response.json(
    hentKommentarliste(request, sakId, docId, { innloggetIdent: innlogget.navIdent, arkivert }),
  );
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { sakReferanse, docId } = krevParametre(params);
  if (request.method !== "POST") {
    throw data("Metoden støttes ikke", { status: 405 });
  }

  let råKropp: unknown;
  try {
    råKropp = await request.json();
  } catch {
    throw data("Ugyldig JSON i forespørselen", { status: 400 });
  }

  const parset = kommentarhandlingSchema.safeParse(råKropp);
  if (!parset.success) {
    throw data("Ugyldig kommentarhandling", { status: 400 });
  }
  const kropp = parset.data;

  // Teksten valideres likt for alle handlinger som bærer innhold.
  let tekst = "";
  if (kropp.handling !== "slett_kommentar" && kropp.handling !== "sett_adressering") {
    const normalisert = normaliserKommentartekst(kropp.tekst);
    if (!normalisert.ok) {
      throw data(normalisert.feil, { status: 400 });
    }
    tekst = normalisert.tekst;
  }

  if (!skalBrukeMockdata) {
    const { token } = await krevLesetilgangIBackend(request, sakReferanse);
    try {
      switch (kropp.handling) {
        case "opprett_traad":
          return Response.json({
            ok: true as const,
            traad: await kommentarApi.opprettKommentartraad(token, sakReferanse, docId, {
              traadId: kropp.traadId,
              kommentarId: kropp.kommentarId,
              anker: fraBackendAnker(kropp.ankerType, kropp.anker),
              opprinneligSitat: kropp.opprinneligSitat ?? null,
              tekst,
            }),
          });
        case "opprett_kommentar":
          return Response.json({
            ok: true as const,
            traad: await kommentarApi.opprettKommentar(token, sakReferanse, docId, kropp.traadId, {
              kommentarId: kropp.kommentarId,
              tekst,
              traadVersjon: kropp.traadVersjon,
            }),
          });
        case "rediger_kommentar":
          return Response.json({
            ok: true as const,
            traad: await kommentarApi.redigerKommentar(
              token,
              sakReferanse,
              docId,
              kropp.kommentarId,
              { tekst, versjon: kropp.versjon },
            ),
          });
        case "slett_kommentar":
          return Response.json({
            ok: true as const,
            traad: await kommentarApi.slettKommentar(
              token,
              sakReferanse,
              docId,
              kropp.kommentarId,
              kropp.versjon,
            ),
          });
        case "sett_adressering":
          return Response.json({
            ok: true as const,
            traad: kropp.adressert
              ? await kommentarApi.adresserKommentartraad(
                  token,
                  sakReferanse,
                  docId,
                  kropp.traadId,
                  kropp.versjon,
                )
              : await kommentarApi.gjenaapneKommentartraad(
                  token,
                  sakReferanse,
                  docId,
                  kropp.traadId,
                  kropp.versjon,
                ),
          });
      }
    } catch (feil) {
      if (feil instanceof KommentarKonfliktFeil) {
        return konfliktsvar(feil.message);
      }
      håndterBackendfeil(feil);
    }
  }

  const { sakId, arkivert } = await krevLesetilgangIMock(request, sakReferanse, docId);
  if (arkivert !== null) {
    // Speiler DokumentArkivertException i backend, som gir 409 – ikke 403.
    return konfliktsvar("Dokumentet er arkivert og kan ikke endres.");
  }
  const innlogget = await hentInnloggetBruker({ request });

  switch (kropp.handling) {
    case "opprett_traad": {
      const resultat = opprettKommentartraad(request, sakId, docId, {
        traadId: kropp.traadId,
        kommentarId: kropp.kommentarId,
        ankertype: kropp.ankerType,
        anker: fraBackendAnker(kropp.ankerType, kropp.anker),
        opprinneligSitat: kropp.opprinneligSitat ?? null,
        tekst,
        forfatterIdent: innlogget.navIdent,
        forfatterNavn: innlogget.name,
      });
      if (resultat.status === "konflikt") return konfliktsvar(resultat.melding);
      if (resultat.status !== "ok") throw data("Kommentartråd ikke funnet", { status: 404 });
      return Response.json({ ok: true as const, traad: resultat.traad });
    }
    case "opprett_kommentar": {
      const resultat = opprettKommentar(request, sakId, docId, kropp.traadId, {
        kommentarId: kropp.kommentarId,
        tekst,
        traadVersjon: kropp.traadVersjon,
        forfatterIdent: innlogget.navIdent,
        forfatterNavn: innlogget.name,
      });
      if (resultat.status === "konflikt") return konfliktsvar(resultat.melding);
      if (resultat.status !== "ok") throw data("Kommentartråd ikke funnet", { status: 404 });
      return Response.json({ ok: true as const, traad: resultat.traad });
    }
    case "rediger_kommentar": {
      const resultat = redigerKommentar(request, sakId, docId, kropp.kommentarId, {
        tekst,
        versjon: kropp.versjon,
        innloggetIdent: innlogget.navIdent,
      });
      if (resultat.status === "konflikt") return konfliktsvar(resultat.melding);
      if (resultat.status === "ikke_forfatter") {
        throw data("Bare forfatteren kan endre eller slette kommentaren", { status: 403 });
      }
      if (resultat.status !== "ok") throw data("Kommentar ikke funnet", { status: 404 });
      return Response.json({ ok: true as const, traad: resultat.traad });
    }
    case "slett_kommentar": {
      const resultat = slettKommentar(request, sakId, docId, kropp.kommentarId, {
        versjon: kropp.versjon,
        innloggetIdent: innlogget.navIdent,
      });
      if (resultat.status === "konflikt") return konfliktsvar(resultat.melding);
      if (resultat.status === "ikke_forfatter") {
        throw data("Bare forfatteren kan endre eller slette kommentaren", { status: 403 });
      }
      if (resultat.status !== "ok") throw data("Kommentar ikke funnet", { status: 404 });
      return Response.json({ ok: true as const, traad: resultat.traad });
    }
    case "sett_adressering": {
      const resultat = settAdressering(request, sakId, docId, kropp.traadId, {
        adressert: kropp.adressert,
        versjon: kropp.versjon,
        innloggetIdent: innlogget.navIdent,
        navn: innlogget.name,
      });
      if (resultat.status === "konflikt") return konfliktsvar(resultat.melding);
      if (resultat.status !== "ok") throw data("Kommentartråd ikke funnet", { status: 404 });
      return Response.json({ ok: true as const, traad: resultat.traad });
    }
  }
}
