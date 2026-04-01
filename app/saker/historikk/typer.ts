import { z } from "zod";
import { kontrollsakHendelseResponseSchema } from "~/saker/types.backend";

export const sakHendelseSchema = kontrollsakHendelseResponseSchema;

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
