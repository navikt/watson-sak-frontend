import { z } from "zod";
import { getBackendOboToken } from "~/auth/access-token";
import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { MIGRERING_SIDESTORRELSE, type MigreringKandidat } from "./types";

const kildeSchema = z.enum(["UTREDNING", "SV", "NKA_DAGPENGER", "NKA_AAP"]);
const kategoriSchema = z.enum([
  "TIPS_RESTANSE",
  "TIPS_VENTER_RESULTAT",
  "SV_RESTANSE",
  "SV_VENTER_RESULTAT",
  "REGISTER_DAGPENGER",
  "REGISTER_AAP",
]);
const ansvarSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("BEKREFTET"), navIdent: z.string() }),
  z.object({ type: z.literal("LOGGTREFF"), navIdent: z.string() }),
  z.object({ type: z.literal("UKJENT"), navIdent: z.null() }),
]);

const kandidatSchema = z.object({
  kandidatId: z.string(),
  kilde: kildeSchema,
  legacyPid: z.string(),
  kategori: kategoriSchema,
  ansvar: ansvarSchema,
  enhet: z.string().nullable(),
  vurdering: z.enum(["MULIG_KANDIDAT", "MA_AVKLARES"]),
  ekskluderFraStatistikk: z.boolean(),
  referansedato: z.string().nullable(),
  referansedatoFelt: z.string().nullable(),
  fase: z.string(),
  begrunnelse: z.string(),
  grunnlag: z.array(z.object({ felt: z.string(), verdi: z.string().nullable() })),
  alleredeMigrertTilKontrollsakId: z.number().nullable(),
  migreringsstatus: z.enum(["IKKE_PABEGYNT", "UNDER_MIGRERING", "FULLSTENDIG"]).nullish(),
  hentetTidspunkt: z.string(),
  personIdent: z.string().nullable(),
});
const sideSchema = z.object({
  items: z.array(kandidatSchema),
  totalItems: z.number(),
  // Backend setter true når NOM eller tilgangsmaskinen ikke svarte og listen kan mangle kandidater.
  utilgjengelig: z.boolean().optional(),
});

export type Migreringsvisning = "MINE" | "ANSATTE";

export interface Migreringsliste {
  kandidater: MigreringKandidat[];
  utilgjengelig: boolean;
  side: number;
  totalSider: number;
  totalAntall: number;
}

/** Første side med innlogget saksbehandlers egne kandidater. */
export async function hentMigreringskandidater(request: Request): Promise<MigreringKandidat[]> {
  return (await hentMigreringsliste(request, "MINE")).kandidater;
}

/**
 * Henter én side. Bruker backendens eksisterende Azure-token og tilgangskontroller, aldri klientvalgt NAV-ident.
 * `ANSATTE` er bare for ledere. Backend skjuler personident i den visningen.
 *
 * @param side 1-basert sidenummer
 */
export async function hentMigreringsliste(
  request: Request,
  visning: Migreringsvisning,
  side = 1,
  størrelse = MIGRERING_SIDESTORRELSE,
): Promise<Migreringsliste> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler lokal backend-url for migreringslisten.");
  }

  const token = await getBackendOboToken(request);
  const response = await fetch(
    `${BACKEND_API_URL}/api/v1/migrering/kandidater?visning=${visning}&page=${side}&size=${størrelse}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke hente migreringskandidater fra Watson Admin API", {
      status: response.status,
    });
    throw new Response("Migreringslisten er ikke tilgjengelig", { status: response.status });
  }
  const parsed = sideSchema.safeParse(await response.json());
  if (!parsed.success) {
    logger.error("Ugyldig kontrakt fra migrerings-API");
    throw new Error("Ugyldig svar fra watson-admin-api (migreringskandidater)");
  }
  const kandidater = parsed.data.items;
  const utilgjengelig = parsed.data.utilgjengelig === true;
  const totalAntall = parsed.data.totalItems;
  const totalSider = Math.ceil(totalAntall / størrelse);

  const mapped = kandidater.map(
    (k): MigreringKandidat => ({
      kandidatId: k.kandidatId,
      kilde: k.kilde,
      legacyKilde: k.kilde,
      pid: k.legacyPid,
      legacyPid: k.legacyPid,
      kategori: k.kategori,
      navn: "",
      ansvar: k.ansvar,
      enhet: k.enhet,
      vurdering: k.vurdering,
      ekskluderFraStatistikk: k.ekskluderFraStatistikk,
      referansedato: k.referansedato,
      referansedatoFelt: k.referansedatoFelt,
      fase: k.fase,
      begrunnelse: k.begrunnelse,
      kildefelter: k.grunnlag,
      alleredeMigrertTilKontrollsakId: k.alleredeMigrertTilKontrollsakId,
      migreringsstatus: k.migreringsstatus ?? undefined,
      hentetTidspunkt: k.hentetTidspunkt,
      personIdent: k.personIdent,
    }),
  );
  return { kandidater: mapped, utilgjengelig, side, totalSider, totalAntall };
}

/** Henter lagret status for én kandidat, etter backendens egen tilgangskontroll. */
export async function hentMigreringskandidat(request: Request, kandidatId: string) {
  const token = await getBackendOboToken(request);
  const response = await fetch(
    `${BACKEND_API_URL}/api/v1/migrering/kandidater/${encodeURIComponent(kandidatId)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke hente migreringsstatus", { status: response.status });
    throw new Response("Migreringsstatus er ikke tilgjengelig", { status: response.status });
  }
  const parsed = kandidatSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Ugyldig svar fra watson-admin-api (migreringsstatus)");
  return parsed.data;
}

/** Avsluttes kun ved uttrykkelig brukerhandling, aldri ved opplasting eller sakopprettelse. */
export async function ferdigstillMigreringskandidat(request: Request, kandidatId: string) {
  const token = await getBackendOboToken(request);
  const response = await fetch(
    `${BACKEND_API_URL}/api/v1/migrering/kandidater/${encodeURIComponent(kandidatId)}/ferdigstill`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke ferdigmerke migreringskandidat", { status: response.status });
    throw new Response("Kunne ikke merke saken ferdig flyttet", { status: response.status });
  }
}
