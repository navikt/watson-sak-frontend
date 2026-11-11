import z from "zod";

export const SaksbehandlerInfoSchema = z.object({
  navIdent: z.string(),
  navn: z.string(),
  enhet: z.string().nullable(),
  enhetId: z.string().nullable(),
  erLeder: z.boolean(),
  erLesebruker: z.boolean().optional(),
});

export type SaksbehandlerInfo = z.infer<typeof SaksbehandlerInfoSchema>;
