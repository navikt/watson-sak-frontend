import { BodyShort, CopyButton, Detail, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
import { Kort } from "~/komponenter/Kort";
import { formaterDato } from "~/utils/date-utils";
import type { Sak } from "~/saker/typer";
import { formaterKilde, hentStatusVariant } from "~/saker/utils";

interface SaksinformasjonKortProps {
  sak: Sak;
}

export function SaksinformasjonKort({ sak }: SaksinformasjonKortProps) {
  return (
    <Kort>
      <VStack gap="space-4">
        <Heading level="2" size="small">
          Saksinformasjon
        </Heading>
        <HStack gap="space-8" wrap>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Sak-ID
            </Detail>
            <HStack gap="space-1" align="center">
              <BodyShort>{sak.id}</BodyShort>
              <CopyButton size="xsmall" copyText={sak.id} />
            </HStack>
          </VStack>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Fødselsnummer
            </Detail>
            <HStack gap="space-1" align="center">
              <BodyShort>{sak.fødselsnummer}</BodyShort>
              <CopyButton size="xsmall" copyText={sak.fødselsnummer} />
            </HStack>
          </VStack>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Status
            </Detail>
            <Tag variant={hentStatusVariant(sak.status)} size="small">
              {sak.status}
            </Tag>
          </VStack>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Innmeldt
            </Detail>
            <BodyShort>{formaterDato(sak.datoInnmeldt)}</BodyShort>
          </VStack>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Kilde
            </Detail>
            <BodyShort>{formaterKilde(sak.kilde)}</BodyShort>
          </VStack>
        </HStack>
      </VStack>
    </Kort>
  );
}
