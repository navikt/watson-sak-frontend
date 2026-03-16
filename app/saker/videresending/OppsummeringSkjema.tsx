import { Heading, Textarea, VStack } from "@navikt/ds-react";

interface OppsummeringSkjemaProps {
  funn: string;
  vurdering: string;
  anbefaling: string;
  onChange: (felt: "funn" | "vurdering" | "anbefaling", verdi: string) => void;
  feil?: {
    funn?: string;
    vurdering?: string;
    anbefaling?: string;
  };
}

export function OppsummeringSkjema({
  funn,
  vurdering,
  anbefaling,
  onChange,
  feil,
}: OppsummeringSkjemaProps) {
  return (
    <VStack gap="space-4">
      <Heading level="2" size="small">
        Oppsummering av utredning
      </Heading>
      <Textarea
        label="Funn"
        description="Beskriv hva du har funnet i utredningen"
        name="funn"
        value={funn}
        onChange={(e) => onChange("funn", e.target.value)}
        error={feil?.funn}
        minRows={3}
      />
      <Textarea
        label="Vurdering"
        description="Hva er din vurdering av funnene?"
        name="vurdering"
        value={vurdering}
        onChange={(e) => onChange("vurdering", e.target.value)}
        error={feil?.vurdering}
        minRows={3}
      />
      <Textarea
        label="Anbefaling"
        description="Hva anbefaler du at mottaker gjør videre?"
        name="anbefaling"
        value={anbefaling}
        onChange={(e) => onChange("anbefaling", e.target.value)}
        error={feil?.anbefaling}
        minRows={3}
      />
    </VStack>
  );
}
