import { z } from "zod";
import { kontrollsakHendelseResponseSchema } from "~/saker/types.backend";

/** Eksakt speiling av `KommentarAktivitetResponse` i watson-admin-api. */
const kommentarAktivitetSchema = z.object({
  handling: z.string(),
  dokumentId: z.string(),
  dokumentTittel: z.string(),
  utfortAvIdent: z.string(),
  utfortAvNavn: z.string(),
  antall: z.number(),
  dato: z.string(),
  visningstekst: z.string(),
});

export type KommentarAktivitet = z.infer<typeof kommentarAktivitetSchema>;

export const sakHendelseSchema = kontrollsakHendelseResponseSchema.extend({
  berortSaksbehandlerNavn: z.string().optional(),
  berortSaksbehandlerNavIdent: z.string().optional(),
  berortSaksbehandlerEnhet: z.string().optional(),
  /**
   * Gruppert kommentaraktivitet på et dokument. Additivt felt: eksisterende
   * hendelsestyper sender `null`. Én rad er alt én saksbehandler gjorde av én
   * type i ett dokument på én dag, og inneholder bevisst **ikke** kommentartekst
   * – `visningstekst` er den ferdigformulerte setningen vi viser direkte.
   *
   * Merk at grupperte hendelser ikke har noen trådId, så lenken går til
   * dokumentets kommentarpanel uten å peke på en enkelt tråd.
   */
  kommentarAktivitet: kommentarAktivitetSchema.nullish(),
});

export type SakHendelse = z.infer<typeof sakHendelseSchema>;
