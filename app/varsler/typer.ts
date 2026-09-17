import { z } from "zod";
import { RouteConfig } from "~/routeConfig";
import { byggKommentarLenke } from "~/saker/filer/dokument/kommentarer/lenker";

export const varselSchema = z.object({
  id: z.string(),
  sakId: z.string(),
  tittel: z.string(),
  tekst: z.string(),
  tidspunkt: z.string(),
  erLest: z.boolean().default(false),
  status: z.enum(["announcement", "warning", "success", "error"]).optional(),
  /** Dokumentet varselet gjelder. Satt for kommentarvarsler, ellers udefinert. */
  dokumentId: z.string().optional(),
  /** Kommentartråden varselet gjelder, slik at lenken kan åpne riktig tråd. */
  traadId: z.string().optional(),
});

export type Varsel = z.infer<typeof varselSchema>;

const varselBackendResponseSchema = z.object({
  id: z.string().uuid(),
  sakId: z.number(),
  tittel: z.string(),
  beskrivelse: z.string(),
  opprettet: z.string(),
  lestTidspunkt: z.string().nullable(),
  // Eksakte feltnavn fra VarselResponse i watson-admin-api.
  dokumentId: z.string().nullish(),
  traadId: z.string().nullish(),
});

export const varselPageBackendResponseSchema = z.object({
  items: z.array(varselBackendResponseSchema),
  page: z.number(),
  size: z.number(),
  totalItems: z.number(),
  totalPages: z.number(),
});

type VarselBackendResponse = z.infer<typeof varselBackendResponseSchema>;

export function tilVarsel(backend: VarselBackendResponse): Varsel {
  return {
    id: backend.id,
    sakId: String(backend.sakId),
    tittel: backend.tittel,
    tekst: backend.beskrivelse,
    tidspunkt: backend.opprettet,
    erLest: backend.lestTidspunkt !== null,
    dokumentId: backend.dokumentId ?? undefined,
    traadId: backend.traadId ?? undefined,
  };
}

/**
 * Hvor varselet skal føre saksbehandleren. Varsler om dokumentkommentarer går
 * rett til dokumentet med kommentarpanelet åpent (og riktig tråd markert),
 * resten går til saken.
 */
export function varselDestinasjon(varsel: Varsel, sakReferanse: string): string {
  if (varsel.dokumentId) {
    return byggKommentarLenke(sakReferanse, varsel.dokumentId, varsel.traadId);
  }
  return RouteConfig.SAKER_DETALJ.replace(":sakId", sakReferanse);
}
