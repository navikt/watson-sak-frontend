import { z } from "zod";

export const varselSchema = z.object({
  id: z.string(),
  sakId: z.string(),
  tittel: z.string(),
  tekst: z.string(),
  tidspunkt: z.string(),
  erLest: z.boolean().default(false),
  status: z.enum(["announcement", "warning", "success", "error"]).optional(),
});

export type Varsel = z.infer<typeof varselSchema>;

const varselBackendResponseSchema = z.object({
  id: z.string().uuid(),
  sakId: z.number(),
  tittel: z.string(),
  beskrivelse: z.string(),
  opprettet: z.string(),
  lestTidspunkt: z.string().nullable(),
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
  };
}
