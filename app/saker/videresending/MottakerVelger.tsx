import { Heading, Radio, RadioGroup, VStack } from "@navikt/ds-react";
import type { Mottaker } from "./typer";
import { mottakerVisningsnavn } from "./typer";

interface MottakerVelgerProps {
  valgt: Mottaker | undefined;
  onChange: (mottaker: Mottaker) => void;
  feil?: string;
}

export function MottakerVelger({ valgt, onChange, feil }: MottakerVelgerProps) {
  return (
    <VStack gap="space-4">
      <Heading level="2" size="small">
        Mottaker
      </Heading>
      <RadioGroup
        legend="Hvem skal saken sendes til?"
        value={valgt ?? ""}
        onChange={(val) => onChange(val as Mottaker)}
        error={feil}
      >
        <Radio value="nay">{mottakerVisningsnavn.nay}</Radio>
        <Radio value="nfp">{mottakerVisningsnavn.nfp}</Radio>
      </RadioGroup>
    </VStack>
  );
}
