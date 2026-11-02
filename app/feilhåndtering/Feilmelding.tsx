import { Alert, BodyShort, Button, Heading, VStack } from "@navikt/ds-react";
import type { ReactNode } from "react";
import { useRevalidator } from "react-router";

/**
 * Når varsling til teamet er på plass (egen PR), bytt til:
 * «Teamet har fått beskjed og jobber med å fikse feilen.»
 */
export const FEILEN_ER_REGISTRERT = "Feilen er registrert hos oss.";

type Props = {
  /** Hva som gikk galt, f.eks. «Vi fikk ikke hentet historikken for saken». */
  tittel: string;
  /** Hva brukeren kan gjøre. Standard: last inn på nytt om litt. */
  children?: ReactNode;
  feilId?: string;
  /** Vis «Prøv igjen», som henter dataene på siden på nytt. */
  kanPrøveIgjen?: boolean;
  size?: "medium" | "small";
  headingLevel?: "2" | "3" | "4";
};

/**
 * Feilmelding for tekniske feil som vises der feilen er, i stedet for en feilside.
 * Sier hva som skjedde, hva brukeren kan gjøre, og at feilen er registrert.
 * Viser aldri tekst eller statuskode fra backend.
 */
export function Feilmelding({
  tittel,
  children,
  feilId,
  kanPrøveIgjen = false,
  size = "small",
  headingLevel = "3",
}: Props) {
  return (
    <Alert variant="error" size={size} role="alert">
      <VStack gap="space-8" align="start">
        <Heading level={headingLevel} size="xsmall">
          {tittel}
        </Heading>
        <BodyShort size={size}>{children ?? "Prøv å laste inn siden på nytt om litt."}</BodyShort>
        <BodyShort size={size}>
          {FEILEN_ER_REGISTRERT}
          {feilId && (
            <>
              {" "}
              Oppgi feil-ID <code>{feilId}</code> hvis du melder feilen i Porten.
            </>
          )}
        </BodyShort>
        {kanPrøveIgjen && <PrøvIgjenKnapp />}
      </VStack>
    </Alert>
  );
}

/** Egen komponent, så `useRevalidator` bare kalles når knappen vises (krever data router). */
function PrøvIgjenKnapp() {
  const revalidator = useRevalidator();
  return (
    <Button
      type="button"
      size="small"
      variant="secondary"
      loading={revalidator.state === "loading"}
      onClick={() => revalidator.revalidate()}
    >
      Prøv igjen
    </Button>
  );
}
