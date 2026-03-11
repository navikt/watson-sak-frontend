import { z } from "zod";

export const journalposttypeSchema = z.enum(["inngående", "utgående", "notat"]);

export type Journalposttype = z.infer<typeof journalposttypeSchema>;

export const journalpostSchema = z.object({
  journalpostId: z.string(),
  tittel: z.string(),
  dato: z.string().date(),
  journalposttype: journalposttypeSchema,
  tema: z.string(),
  avsenderMottaker: z.string(),
  dokumentUrl: z.string().url(),
});

export type Journalpost = z.infer<typeof journalpostSchema>;
