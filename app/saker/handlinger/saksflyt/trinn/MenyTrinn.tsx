import { ArrowRightIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Detail, VStack } from "@navikt/ds-react";
import type { Sakshandling } from "../saksflyt";

function Seksjon({
  tittel,
  beskrivelse,
  handlinger,
  onVelg,
  deaktivert,
}: {
  tittel: string;
  beskrivelse: string;
  handlinger: Sakshandling[];
  onVelg: (handling: Sakshandling) => void;
  deaktivert: boolean;
}) {
  if (handlinger.length === 0) return null;
  const overskriftId = `saksflyt-seksjon-${tittel.toLowerCase()}`;
  return (
    <VStack as="section" gap="space-12" aria-labelledby={overskriftId}>
      <VStack gap="space-4">
        <Detail id={overskriftId} uppercase weight="semibold" textColor="subtle">
          {tittel}
        </Detail>
        <BodyShort size="small" textColor="subtle">
          {beskrivelse}
        </BodyShort>
      </VStack>
      {handlinger.map((handling) =>
        handling.seksjon === "steg" ? (
          <Button
            key={handling.id}
            type="button"
            variant={handling.erPrimær ? "primary" : "secondary"}
            icon={<ArrowRightIcon aria-hidden />}
            iconPosition="right"
            onClick={() => onVelg(handling)}
            disabled={deaktivert}
          >
            {handling.etikett}
          </Button>
        ) : (
          <Button
            key={handling.id}
            type="button"
            variant="secondary"
            data-color="neutral"
            onClick={() => onVelg(handling)}
            disabled={deaktivert}
          >
            {handling.etikett}
          </Button>
        ),
      )}
    </VStack>
  );
}

export function MenyTrinn({
  handlinger,
  onVelg,
  deaktivert,
}: {
  handlinger: Sakshandling[];
  onVelg: (handling: Sakshandling) => void;
  deaktivert: boolean;
}) {
  const steg = handlinger.filter((handling) => handling.seksjon === "steg");
  const resultat = handlinger.filter((handling) => handling.seksjon === "resultat");
  return (
    <VStack gap="space-20">
      <Seksjon
        tittel="Steg"
        beskrivelse="Flytt saken videre i saksflyten"
        handlinger={steg}
        onVelg={onVelg}
        deaktivert={deaktivert}
      />
      {steg.length > 0 && resultat.length > 0 && <hr className="border-ax-border-neutral-subtle" />}
      <Seksjon
        tittel="Resultat"
        beskrivelse="Registrer resultat og avslutt saken"
        handlinger={resultat}
        onVelg={onVelg}
        deaktivert={deaktivert}
      />
    </VStack>
  );
}
