import z from "zod";

export const SaksbehandlerInfoSchema = z.object({
  navIdent: z.string(),
  organisasjoner: z.array(z.string()),
});

export type SaksbehandlerInfo = z.infer<typeof SaksbehandlerInfoSchema>;
