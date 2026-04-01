import { BodyShort, CopyButton, Detail, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
import { Kort } from "~/komponenter/Kort";
import { getSaksreferanse } from "~/saker/id";
import { formaterDato } from "~/utils/date-utils";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getOpprettetDato, getStatusVariantForSak } from "~/saker/selectors";
import { getKildeText, getPersonIdent, getStatus } from "~/saker/visning";

interface SaksinformasjonKortProps {
  sak: KontrollsakResponse;
}

export function SaksinformasjonKort({ sak }: SaksinformasjonKortProps) {
  const personIdent = getPersonIdent(sak);
  const status = getStatus(sak);
  const opprettetDato = getOpprettetDato(sak);
  const kilde = getKildeText(sak);
  const saksreferanse = getSaksreferanse(sak.id);

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
              <BodyShort>{saksreferanse}</BodyShort>
              <CopyButton size="xsmall" copyText={sak.id} />
            </HStack>
          </VStack>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Fødselsnummer
            </Detail>
            <HStack gap="space-1" align="center">
              <BodyShort>{personIdent}</BodyShort>
              <CopyButton size="xsmall" copyText={personIdent} />
            </HStack>
          </VStack>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Status
            </Detail>
            <Tag variant={getStatusVariantForSak(sak)} size="small">
              {status}
            </Tag>
          </VStack>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Innmeldt
            </Detail>
            <BodyShort>{formaterDato(opprettetDato)}</BodyShort>
          </VStack>
          <VStack gap="space-1">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Kilde
            </Detail>
            <BodyShort>{kilde}</BodyShort>
          </VStack>
        </HStack>
      </VStack>
    </Kort>
  );
}
