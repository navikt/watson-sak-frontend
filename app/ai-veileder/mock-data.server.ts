import type { ChatSvar } from "./api.server";

/**
 * Mock-svar for lokal utvikling (`local-mock`/`demo`) uten en kjørende
 * watson-admin-api. Speiler responsformen fra det ekte chatbot-endepunktet,
 * men er ikke koblet til noen ekte AI.
 */
export function hentMockChatSvar(melding: string): ChatSvar {
  const trimmet = melding.trim();
  if (!trimmet) {
    return {
      reply: "Still et spørsmål, så prøver jeg å hjelpe.",
      timestamp: new Date().toISOString(),
      escalateSuggested: false,
      guard: "ALLOWED",
    };
  }
  return {
    reply: `(Mock) Dette er et eksempelsvar på: "${trimmet}"`,
    timestamp: new Date().toISOString(),
    escalateSuggested: false,
    guard: "ALLOWED",
  };
}
