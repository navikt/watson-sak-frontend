import { z } from "zod";
import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";

const chatMessageResponseSchema = z.object({
  data: z.object({
    reply: z.string(),
    timestamp: z.string(),
    escalateSuggested: z.boolean(),
    guard: z.string(),
  }),
});

export type ChatSvar = z.infer<typeof chatMessageResponseSchema>["data"];

/** Kastes når backend svarer 429 (rate limit) — skilles ut for egen håndtering i ressursruten. */
export class ChatRateLimitFeil extends Error {}

function apiUrl(sti: string): string {
  if (!BACKEND_API_URL) {
    throw new Error("BACKEND_API_URL er ikke satt");
  }
  return `${BACKEND_API_URL}${sti}`;
}

/**
 * Sender en melding til AI-veilederen (UI-hjelpe-chatbot) i watson-admin-api.
 *
 * Boten har ingen tilgang til kontrollsak-/persondata — kun en statisk
 * kunnskapsbase om selve grensesnittet. Se watson-admin-api sin chatbot-runbook
 * for detaljer om guards, rate limiting og Gemini-integrasjonen.
 */
export async function sendChatMelding(token: string, melding: string): Promise<ChatSvar> {
  const respons = await fetch(apiUrl("/api/v1/chatbot/message"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ message: melding }),
  });

  if (respons.status === 429) {
    throw new ChatRateLimitFeil("For mange meldinger til AI-veilederen");
  }
  if (!respons.ok) {
    logger.warn("AI-veileder svarte med feilstatus", { status: respons.status });
    throw new Error(`AI-veilederen svarte med status ${respons.status}`);
  }

  const json = await respons.json();
  const parsed = chatMessageResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.error("Ugyldig svar fra chatbot-endepunkt", { feil: parsed.error.format() });
    throw new Error("Ugyldig svar fra AI-veilederen");
  }
  return parsed.data.data;
}
