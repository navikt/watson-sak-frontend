import { z } from "zod";
import { getBackendOboToken } from "~/auth/access-token";
import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { sti } from "~/saker/sti-param.server";
import {
  MIGRERING_SIDESTORRELSE,
  type MigreringAnsatt,
  type MigreringKandidat,
  type MigreringMottakere,
  type Migreringsstatus,
} from "./types";

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
  ansvarligNavn: z.string().nullish(),
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

const ansattSchema = z.object({
  navIdent: z.string(),
  navn: z.string(),
  enhetId: z.string(),
  enhetNavn: z.string().nullish(),
});

export type Migreringsvisning = "MINE" | "ANSATTE" | "ALLE";

/** Filtre som backend anvender før paginering. `enhet` og `ansvarlig` gjelder bare ANSATTE og ALLE. */
export interface Migreringsfilter {
  status?: readonly Migreringsstatus[];
  enhet?: string | null;
  ansvarlig?: string | null;
}

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
 * `ANSATTE` og `ALLE` er bare for ledere. Backend sender personident bare når ansvaret er bekreftet.
 *
 * @param side 1-basert sidenummer
 */
export async function hentMigreringsliste(
  request: Request,
  visning: Migreringsvisning,
  side = 1,
  størrelse = MIGRERING_SIDESTORRELSE,
  filter: Migreringsfilter = {},
): Promise<Migreringsliste> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler lokal backend-url for migreringslisten.");
  }

  const token = await getBackendOboToken(request);
  const query = new URLSearchParams({
    visning,
    page: String(side),
    size: String(størrelse),
  });
  for (const status of filter.status ?? []) query.append("status", status);
  if (visning !== "MINE") {
    if (filter.enhet) query.set("enhet", filter.enhet);
    if (filter.ansvarlig) query.set("ansvarlig", filter.ansvarlig);
  }
  const response = await fetch(
    `${BACKEND_API_URL}${sti`/api/v1/migrering/kandidater`}?${query.toString()}`,
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

  const mapped = kandidater.map((k): MigreringKandidat => ({
    kandidatId: k.kandidatId,
    kilde: k.kilde,
    legacyKilde: k.kilde,
    pid: k.legacyPid,
    legacyPid: k.legacyPid,
    kategori: k.kategori,
    navn: "",
    ansvar: k.ansvar,
    enhet: k.enhet,
    ansvarligNavn: k.ansvarligNavn,
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
  }));
  return { kandidater: mapped, utilgjengelig, side, totalSider, totalAntall };
}

/** Henter lagret status for én kandidat, etter backendens egen tilgangskontroll. */
export async function hentMigreringskandidat(request: Request, kandidatId: string) {
  const token = await getBackendOboToken(request);
  const response = await fetch(
    `${BACKEND_API_URL}${sti`/api/v1/migrering/kandidater/${kandidatId}`}`,
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
    `${BACKEND_API_URL}${sti`/api/v1/migrering/kandidater/${kandidatId}/ferdigstill`}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke ferdigmerke migreringskandidat", { status: response.status });
    throw new Response("Kunne ikke merke saken ferdig flyttet", { status: response.status });
  }
}

/** Ansatte lederen kan se kandidater for. Bare for ledere. Backend avviser andre. */
export async function hentMigreringsAnsatte(request: Request): Promise<MigreringAnsatt[]> {
  const token = await getBackendOboToken(request);
  const response = await fetch(`${BACKEND_API_URL}${sti`/api/v1/migrering/ansatte`}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke hente ansatte for migrering", { status: response.status });
    throw new Response("Ansatte er ikke tilgjengelig", { status: response.status });
  }
  const parsed = z.array(ansattSchema).safeParse(await response.json());
  if (!parsed.success) throw new Error("Ugyldig svar fra watson-admin-api (migrering/ansatte)");
  return parsed.data.map((a) => ({
    navIdent: a.navIdent,
    navn: a.navn,
    enhetId: a.enhetId,
    enhetNavn: a.enhetNavn,
  }));
}

const mottakereSchema = z.object({
  enheter: z.array(z.object({ id: z.string(), navn: z.string() })),
  mottakere: z.array(
    z.object({
      navIdent: z.string(),
      navn: z.string(),
      enhetId: z.string().nullish(),
      enhetNavn: z.string().nullish(),
    }),
  ),
});

/** Enheter og saksbehandlere lederen kan flytte saker til, i hvilken som helst enhet. Backend avviser andre enn ledere. */
export async function hentMigreringsMottakere(request: Request): Promise<MigreringMottakere> {
  const token = await getBackendOboToken(request);
  const response = await fetch(`${BACKEND_API_URL}${sti`/api/v1/migrering/mottakere`}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke hente mottakere for migrering", { status: response.status });
    throw new Response("Mottakere er ikke tilgjengelig", { status: response.status });
  }
  const parsed = mottakereSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Ugyldig svar fra watson-admin-api (migrering/mottakere)");
  return parsed.data;
}

/** Flytter en kandidat som ikke er påbegynt til en annen saksbehandler. Backend validerer at lederen har rett til det. */
export async function tildelMigreringskandidat(
  request: Request,
  kandidatId: string,
  navIdent: string,
): Promise<void> {
  const token = await getBackendOboToken(request);
  const response = await fetch(
    `${BACKEND_API_URL}${sti`/api/v1/migrering/kandidater/${kandidatId}/tildel`}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ navIdent }),
    },
  );
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke tildele migreringskandidat", { status: response.status });
    throw new Response("Kunne ikke endre tildeling", { status: response.status });
  }
}
