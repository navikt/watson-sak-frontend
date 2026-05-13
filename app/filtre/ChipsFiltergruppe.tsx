import { Chips, Label } from "@navikt/ds-react";

type FilterAlternativ = {
  verdi: string;
  etikett: string;
};

interface ChipsFiltergruppeProps {
  tittel: string;
  alternativer: FilterAlternativ[];
  valgteVerdier: string[];
  onToggle: (verdi: string) => void;
  size?: "small" | "medium";
}

export function ChipsFiltergruppe({
  tittel,
  alternativer,
  valgteVerdier,
  onToggle,
  size,
}: ChipsFiltergruppeProps) {
  return (
    <div>
      <Label as="p" size="small" spacing>
        {tittel}
      </Label>
      <Chips size={size}>
        {alternativer.map((alt) => (
          <Chips.Toggle
            key={alt.verdi}
            selected={valgteVerdier.includes(alt.verdi)}
            onClick={() => onToggle(alt.verdi)}
          >
            {alt.etikett}
          </Chips.Toggle>
        ))}
      </Chips>
    </div>
  );
}
