import { z } from "zod";

const varselStatusSchema = z.enum(["announcement", "warning", "success", "error"]);

export const varselSchema = z.object({
  id: z.string(),
  sakId: z.string(),
  tittel: z.string(),
  tekst: z.string(),
  tidspunkt: z.string().date(),
  erLest: z.boolean().default(false),
  status: varselStatusSchema,
});

export type Varsel = z.infer<typeof varselSchema>;
