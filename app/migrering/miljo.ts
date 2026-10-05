/**
 * Miljøer der migreringsveilederen kaller ekte backend. `prod` og `demo` er stengt, og mock-miljøene bruker
 * syntetiske eksempler. Åpnes for `prod` først når importen er godkjent.
 */
export function migreringErÅpen(miljø: string | undefined): boolean {
  return miljø === "local-backend" || miljø === "dev";
}
