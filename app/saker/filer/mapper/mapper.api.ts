import { data, type ActionFunctionArgs } from "react-router";
import { z } from "zod";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import * as backendApi from "~/saker/api.server";
import { hentStegbaserteSaksregler } from "~/saker/stegregler";
import { harDirekteSakstilgang, hentSakstilgangFraMock } from "~/saker/tilgang.server";
import {
  endreMappe,
  flyttDokumentTilMappe,
  flyttFilTilMappe,
  opprettMappe,
  slettMappe,
  type MappeResultat,
} from "~/testing/mock-store/mapper.server";
import { hentMockState } from "~/testing/mock-store/session.server";
import { mappestiSchema } from "./mappesti";

const målmappeSchema = mappestiSchema.nullable();

/** Alle mappehandlinger går gjennom samme route, skilt med feltet `handling`. */
const mappehandlingSchema = z.discriminatedUnion("handling", [
  z.object({ handling: z.literal("opprett"), sti: mappestiSchema }),
  z.object({ handling: z.literal("endre"), fraSti: mappestiSchema, tilSti: mappestiSchema }),
  z.object({ handling: z.literal("slett"), sti: mappestiSchema }),
  z.object({ handling: z.literal("flytt-dokument"), id: z.string().min(1), mappe: målmappeSchema }),
  z.object({ handling: z.literal("flytt-fil"), id: z.string().min(1), mappe: målmappeSchema }),
]);

export type Mappehandling = z.input<typeof mappehandlingSchema>;

export type MappehandlingSvar = { ok: true } | { ok: false; melding: string };

function feil(status: number, melding: string) {
  return data<MappehandlingSvar>({ ok: false, melding }, { status });
}

async function utførMotBackend(
  request: Request,
  sakId: string,
  handling: z.output<typeof mappehandlingSchema>,
) {
  const token = await getBackendOboToken(request);
  const [sak, innlogget] = await Promise.all([
    backendApi.hentKontrollsak(token, sakId),
    hentInnloggetBruker({ request }),
  ]);
  if (!harDirekteSakstilgang(sak, innlogget)) {
    throw data("Ingen tilgang til å endre mapper", { status: 403 });
  }
  if (!hentStegbaserteSaksregler(sak.steg).kanLasteOppFiler) {
    throw data("Mapper kan ikke endres når saken er avsluttet", { status: 403 });
  }

  try {
    switch (handling.handling) {
      case "opprett":
        await backendApi.opprettMappe(token, sakId, handling.sti);
        break;
      case "endre":
        await backendApi.endreMappe(token, sakId, handling.fraSti, handling.tilSti);
        break;
      case "slett":
        await backendApi.slettMappe(token, sakId, handling.sti);
        break;
      case "flytt-dokument":
        await backendApi.flyttDokumentTilMappe(token, sakId, handling.id, handling.mappe);
        break;
      case "flytt-fil":
        await backendApi.flyttFilTilMappe(token, sakId, handling.id, handling.mappe);
        break;
    }
  } catch (feilen) {
    if (
      feilen instanceof backendApi.BackendFeilException &&
      [400, 404, 409].includes(feilen.status)
    ) {
      return feil(feilen.status, feilen.message);
    }
    throw feilen;
  }
  return { ok: true as const };
}

async function utførMotMock(
  request: Request,
  sakReferanse: string,
  handling: z.output<typeof mappehandlingSchema>,
) {
  const tilgang = await hentSakstilgangFraMock(request, sakReferanse);
  if (!tilgang) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  if (!tilgang.kanLasteOppFiler) {
    throw data("Ingen tilgang til å endre mapper", { status: 403 });
  }

  const state = hentMockState(request);
  const sakId = String(tilgang.sak.id);
  const { navIdent } = await hentInnloggetBruker({ request });

  let resultat: MappeResultat;
  switch (handling.handling) {
    case "opprett":
      resultat = opprettMappe(state, sakId, handling.sti, navIdent);
      break;
    case "endre":
      resultat = endreMappe(state, sakId, handling.fraSti, handling.tilSti, navIdent);
      break;
    case "slett":
      resultat = slettMappe(state, sakId, handling.sti);
      break;
    case "flytt-dokument":
      resultat = flyttDokumentTilMappe(state, sakId, handling.id, handling.mappe);
      break;
    case "flytt-fil":
      resultat = flyttFilTilMappe(state, sakId, handling.id, handling.mappe);
      break;
  }
  return resultat.ok ? { ok: true as const } : feil(resultat.status, resultat.melding);
}

/**
 * Resource route for mapper i Filer-området. Tar imot JSON med feltet `handling`:
 *
 * - `opprett` – oppretter mappen `sti` (og manglende overordnede mapper).
 * - `endre` – gir mappen `fraSti` ny sti `tilSti`. Brukes både til nytt navn og flytting.
 * - `slett` – sletter en tom mappe.
 * - `flytt-dokument` / `flytt-fil` – flytter et element til `mappe` (`null` = rotnivå).
 *
 * Kjente feil (ugyldig navn, finnes fra før, ikke tom) returneres som `{ ok: false, melding }`
 * slik at komponenten kan vise dem uten å gå til error boundary.
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const sakReferanse = params.sakId;
  if (!sakReferanse) {
    throw data("Mangler sak", { status: 400 });
  }
  if (request.method !== "POST") {
    throw data("Metoden støttes ikke", { status: 405 });
  }

  const body: unknown = await request.json().catch(() => null);
  const resultat = mappehandlingSchema.safeParse(body);
  if (!resultat.success) {
    return feil(400, resultat.error.issues[0]?.message ?? "Ugyldig forespørsel");
  }

  return skalBrukeMockdata
    ? utførMotMock(request, sakReferanse, resultat.data)
    : utførMotBackend(request, sakReferanse, resultat.data);
}
