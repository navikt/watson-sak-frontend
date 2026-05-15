import z from "zod";

export const SaksbehandlerInfoSchema = z.object({
  navIdent: z.string(),
  navn: z.string(),
  enhet: z.string().nullable(),
});

export type SaksbehandlerInfo = z.infer<typeof SaksbehandlerInfoSchema>;
