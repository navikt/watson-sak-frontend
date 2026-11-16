/**
 * Miljøer der migreringsveilederen kaller ekte backend. Mock-miljøene
 * (`local-mock` og `demo`) bruker syntetiske eksempler.
 */
export function migreringErÅpen(miljø: string | undefined): boolean {
  return miljø === "local-backend" || miljø === "dev" || miljø === "prod";
}
