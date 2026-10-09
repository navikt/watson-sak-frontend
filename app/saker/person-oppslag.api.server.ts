import { z } from "zod";
import { logger } from "~/logging/logging";
import { apiUrl, authHeaders, parseEllerKastFeil } from "~/saker/api-core.server";

// --- Personoppslag ---

const personOppslagResponseSchema = z.object({
  navn: z.string(),
  personIdent: z.string(),
  alder: z.number(),
  adresseskjermet: z.boolean().default(false),
  // Angir om saksbehandler har (Utvidet) tilgang til å opprette sak på personen.
  // false kun når personen er skjermet og saksbehandler mangler Utvidet tilgang —
  // brukes til å sperre skjemaet proaktivt i UI, se RAILS-9.
  kanOppretteSak: z.boolean().default(true),
});

type PersonOppslagBackendResponse = z.infer<typeof personOppslagResponseSchema>;

export type SlåOppPersonResultat =
  | { type: "success"; person: PersonOppslagBackendResponse }
  | { type: "ikke-funnet" }
  | { type: "ingen-tilgang" }
  | { type: "feil"; melding: string };

export async function slåOppPerson(
  token: string,
  personIdent: string,
): Promise<SlåOppPersonResultat> {
  const respons = await fetch(apiUrl("/api/v1/person/oppslag"), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ personIdent }),
  });

  if (respons.ok) {
    const person = parseEllerKastFeil(
      personOppslagResponseSchema,
      await respons.json(),
      "slåOppPerson",
    );
    return { type: "success", person };
  }

  if (respons.status === 403) return { type: "ingen-tilgang" };
  if (respons.status === 404) return { type: "ikke-funnet" };

  logger.error(`Personoppslag feilet — status ${respons.status}`);
  return { type: "feil", melding: "Feil i baksystem – prøv igjen senere" };
}
