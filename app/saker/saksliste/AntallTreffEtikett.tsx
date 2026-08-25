import { BodyShort, HStack } from "@navikt/ds-react";

type Props = {
  antall: number;
};

/**
 * Viser totalt antall saker/treff øverst til høyre over en saksliste,
 * slik at saksbehandler ser hvor mange saker som matcher gjeldende filtre.
 */
export function AntallTreffEtikett({ antall }: Props) {
  return (
    <HStack justify="end">
      <BodyShort size="small" className="text-ax-text-neutral-subtle">
        {antall} {antall === 1 ? "sak" : "saker"}
      </BodyShort>
    </HStack>
  );
}
