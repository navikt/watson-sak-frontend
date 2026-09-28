import { z } from "zod";
import { getBackendOboToken } from "~/auth/access-token";
import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import type { MigreringKandidat } from "./types";

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
  hentetTidspunkt: z.string(),
  personIdent: z.string().nullable(),
});
const sideSchema = z.object({
  items: z.array(kandidatSchema),
  totalItems: z.number(),
});

/** Bruker backendens eksisterende Azure-token og tilgangskontroller, aldri klientvalgt NAV-ident. */
export async function hentMigreringskandidater(request: Request): Promise<MigreringKandidat[]> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler lokal backend-url for migreringslisten.");
  }

  const token = await getBackendOboToken(request);
  const response = await fetch(`${BACKEND_API_URL}/api/v1/migrering/kandidater?page=1&size=100`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
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
  if (parsed.data.totalItems > parsed.data.items.length) {
    throw new Error("Migreringslisten er ikke fullstendig i lokal forhåndsvisning");
  }

  return parsed.data.items.map(
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
      hentetTidspunkt: k.hentetTidspunkt,
      personIdent: k.personIdent,
    }),
  );
}
