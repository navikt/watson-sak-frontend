import { Feilmelding } from "./Feilmelding";
import { type Innsendingstekster, velgTekst } from "./feilmeldinger";

/** Svaret `tekniskFeilSvar` gir fra en action. */
export type TekniskFeil = { teknisk: true; feilId: string; usikker?: boolean };

/**
 * Type-guard for svaret `tekniskFeilSvar` gir fra en action. Typen har bevisst ikke med
 * `usikker`, så den snevrer inn unioner der feltet mangler. Les det med `erUsikkerFeil`.
 */
export function erTekniskFeilSvar(svar: unknown): svar is { teknisk: true; feilId: string } {
  return !!svar && typeof svar === "object" && "teknisk" in svar && svar.teknisk === true;
}

/** `true` med mindre svaret sier sikkert at endringen ikke ble lagret. Usikker er det trygge valget. */
function erUsikkerFeil(svar: { teknisk: true; feilId: string }): boolean {
  return (svar as { usikker?: unknown }).usikker !== false;
}

/** Plukker ut feltene vi trenger, så komponenter kan holde på feilen i egen state. */
export function tekniskFeilFra(svar: { teknisk: true; feilId: string }): TekniskFeil {
  return { teknisk: true, feilId: svar.feilId, usikker: erUsikkerFeil(svar) };
}

/**
 * Viser `<Feilmelding>` ved en innsendingsknapp når actionen svarte med teknisk feil.
 * Rendrer ingenting ellers, så eksisterende visning av 4xx-feil kan stå ved siden av.
 * Tekstene kommer fra `INNSENDINGSFEIL` i `feilmeldinger.ts`. Mangler `usikker` i svaret,
 * velges «vet ikke»-teksten, fordi det er det trygge valget.
 */
export function Innsendingsfeil({ svar, tekster }: { svar: unknown; tekster: Innsendingstekster }) {
  if (!erTekniskFeilSvar(svar)) return null;
  const { tittel, tekst } = velgTekst(tekster, erUsikkerFeil(svar));
  return (
    <Feilmelding tittel={tittel} feilId={svar.feilId}>
      {tekst}
    </Feilmelding>
  );
}
