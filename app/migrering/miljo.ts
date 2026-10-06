/**
 * Miljøer der migreringsveilederen kaller ekte backend. `prod` er stengt, og mock-miljøene (`local-mock` og
 * `demo`) bruker syntetiske eksempler. Åpnes for `prod` først når importen er godkjent.
 */
export function migreringErÅpen(miljø: string | undefined): boolean {
  return miljø === "local-backend" || miljø === "dev";
}
