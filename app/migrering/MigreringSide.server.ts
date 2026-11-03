import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { tekniskFeilSvar } from "~/feilhåndtering/teknisk-feil.server";
import { velgMigreringKilde, type TildelingsSvar } from "./migrering-kilde.server";
import { MIGRERINGSSTATUSER, type MigreringFilter, type MigreringLister } from "./types";

export type { TildelingsSvar };

/** Sidenummer fra URL-en. Ugyldige verdier gir side 1. */
function lesSide(url: URL, navn: string): number {
  const verdi = url.searchParams.get(navn) ?? "";
  if (!/^\d+$/.test(verdi)) return 1;
  const side = Number(verdi);
  return Number.isSafeInteger(side) && side >= 1 ? side : 1;
}

const IDENT_MØNSTER = /^[A-Za-z0-9æøåÆØÅ_-]{1,20}$/;

/** Filtre fra URL-en. Ukjente verdier ignoreres, så en feil lenke aldri gir en feilside. */
export function lesFilter(url: URL): MigreringFilter {
  const status = MIGRERINGSSTATUSER.filter((kandidat) =>
    url.searchParams.getAll("status").includes(kandidat),
  );
  const enhet = url.searchParams.get("enhet") ?? "";
  const ansvarlig = url.searchParams.get("ansvarlig") ?? "";
  return {
    status,
    enhet: IDENT_MØNSTER.test(enhet) ? enhet : null,
    ansvarlig: IDENT_MØNSTER.test(ansvarlig) ? ansvarlig : null,
  };
}

export async function loader({ request }: LoaderFunctionArgs): Promise<MigreringLister> {
  const url = new URL(request.url);
  return velgMigreringKilde(request).hentLister({
    side: lesSide(url, "side"),
    filter: lesFilter(url),
  });
}

const KANDIDAT_ID_MØNSTER = /^(UTREDNING|SV|NKA_DAGPENGER|NKA_AAP):\d{1,12}$/;
const NAV_IDENT_MØNSTER = /^[A-Za-z]\d{6}$/;

/** Lederen flytter en kandidat til en annen ansatt. Kilden avgjør om lederen har rett til det. */
export async function action({
  request,
}: ActionFunctionArgs): Promise<TildelingsSvar | ReturnType<typeof tekniskFeilSvar>> {
  const bruker = await hentInnloggetBruker({ request });
  if (!bruker.erLeder) {
    throw data("Bare ledere kan endre tildeling", { status: 403 });
  }
  const skjema = await request.formData();
  const kandidatId = String(skjema.get("kandidatId") ?? "");
  const navIdent = String(skjema.get("navIdent") ?? "");
  if (!KANDIDAT_ID_MØNSTER.test(kandidatId) || !NAV_IDENT_MØNSTER.test(navIdent)) {
    throw data("Ugyldig tildeling", { status: 400 });
  }
  try {
    return await velgMigreringKilde(request).tildel({ bruker, kandidatId, navIdent });
  } catch (feil) {
    return tekniskFeilSvar(feil, { kontekst: "tildele migreringssak", request });
  }
}
