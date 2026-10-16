import type { FieldMetadata } from "@conform-to/react";
import { Radio, RadioGroup } from "@navikt/ds-react";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { STANDARD_TEMA, type Tema } from "./tema";

interface TemaVelgerProps {
  felt: FieldMetadata<Tema | undefined>;
}

/** Radioknapper for valg av Watson-tema med beskrivelsene fra kodeverket. */
export function TemaVelger({ felt }: TemaVelgerProps) {
  const { temaer } = useKodeverk();

  return (
    <RadioGroup
      key={felt.key}
      name={felt.name}
      legend="Tema"
      error={felt.errors?.[0] ?? (temaer.length === 0 ? "Tema er ikke tilgjengelig." : undefined)}
      defaultValue={felt.initialValue ?? STANDARD_TEMA}
    >
      {temaer.map(({ kode, beskrivelse }) => (
        <Radio key={kode} value={kode}>
          {`${beskrivelse} (${kode})`}
        </Radio>
      ))}
    </RadioGroup>
  );
}
