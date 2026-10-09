import { BodyShort, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import { PlusIcon } from "@navikt/aksel-icons";
import type { YtelseRadVerdier } from "./skjema-helpers";
import { YtelseRadFelt } from "./YtelseRadFelt";

export type YtelseRadState = {
  id: string;
  defaults: YtelseRadVerdier;
};

type Props = {
  ytelseRader: YtelseRadState[];
  ytelseAlternativer: Array<{ value: string; label: string }>;
  feil: Record<string, string[]>;
  onFjern: (id: string) => void;
  onLeggTil: () => void;
};

export function YtelserSkjema({
  ytelseRader,
  ytelseAlternativer,
  feil,
  onFjern,
  onLeggTil,
}: Props) {
  return (
    <VStack gap="space-16">
      <VStack gap="space-4">
        <Heading level="2" size="medium">
          Ytelser med mulig misbruk
        </Heading>
        <BodyShort textColor="subtle">
          Legg til én eller flere ytelser med tilhørende periode og beløp. Alle feltene er valgfrie.
        </BodyShort>
      </VStack>

      <VStack gap="space-16">
        {ytelseRader.map((rad, indeks) => (
          <YtelseRadFelt
            key={rad.id}
            indeks={indeks}
            ytelser={ytelseAlternativer}
            kanFjernes={ytelseRader.length > 1}
            onFjern={() => onFjern(rad.id)}
            defaults={rad.defaults}
            feil={feil}
            visEndeligBeløp={false}
          />
        ))}
      </VStack>

      <HStack>
        <Button
          type="button"
          variant="tertiary"
          size="small"
          icon={<PlusIcon aria-hidden />}
          onClick={onLeggTil}
        >
          Legg til ytelse
        </Button>
      </HStack>
    </VStack>
  );
}
