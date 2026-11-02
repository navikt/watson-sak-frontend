import { Feilmelding } from "./Feilmelding";

type Svar = { ok?: boolean; teknisk?: boolean; feilId?: string } | null | undefined;

/** Type-guard for svaret `tekniskFeilSvar` gir fra en action. */
export function erTekniskFeilSvar(svar: unknown): svar is { teknisk: true; feilId: string } {
  return !!svar && typeof svar === "object" && "teknisk" in svar && svar.teknisk === true;
}

/**
 * Viser `<Feilmelding>` ved en innsendingsknapp når actionen svarte med teknisk feil.
 * Rendrer ingenting ellers, så eksisterende visning av 4xx-feil kan stå ved siden av.
 */
export function Innsendingsfeil({
  svar,
  tittel = "Vi fikk ikke lagret endringen",
  children = "Sjekk om endringen ble lagret før du prøver igjen.",
}: {
  svar: Svar | unknown;
  tittel?: string;
  children?: React.ReactNode;
}) {
  if (!erTekniskFeilSvar(svar)) return null;
  return (
    <Feilmelding tittel={tittel} feilId={svar.feilId}>
      {children}
    </Feilmelding>
  );
}
