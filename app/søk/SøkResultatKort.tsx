import { CalendarIcon, TagIcon } from "@navikt/aksel-icons";
import { BodyShort, Detail, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
import { Link } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getKategoriText, getOpprettetDato, getStatusVariantForSak } from "~/saker/selectors";
import { getBeskrivelse, getKildeText, getPersonIdent, getStatus } from "~/saker/visning";
import { formaterDato } from "~/utils/date-utils";

interface SøkResultatKortProps {
  sak: KontrollsakResponse;
}

export function SøkResultatKort({ sak }: SøkResultatKortProps) {
  const detaljSti = RouteConfig.SAKER_DETALJ.replace(":sakId", sak.id);
  const saksreferanse = getSaksreferanse(sak.id);

  return (
    <Kort
      as="article"
      className="focus-within:[outline:3px_solid_var(--ax-border-focus)] focus-within:outline-offset-[3px]"
    >
      <VStack gap="space-4">
        <HStack gap="space-4" align="center" justify="space-between">
          <Link to={detaljSti} className="no-underline focus-visible:outline-none">
            <Heading level="2" size="small">
              Sak {saksreferanse}
            </Heading>
          </Link>
          <Tag variant={getStatusVariantForSak(sak)} size="small">
            {getStatus(sak)}
          </Tag>
        </HStack>

        <HStack gap="space-6" align="center" wrap>
          <HStack gap="space-2" align="center">
            <CalendarIcon aria-hidden fontSize="1rem" />
            <Detail>{formaterDato(getOpprettetDato(sak))}</Detail>
          </HStack>
          <Detail>{getKildeText(sak)}</Detail>
          <Detail>Fnr: {getPersonIdent(sak)}</Detail>
          {getKategoriText(sak) && (
            <HStack gap="space-2" align="center">
              <TagIcon aria-hidden fontSize="1rem" />
              <Detail>{getKategoriText(sak)}</Detail>
            </HStack>
          )}
        </HStack>

        {getBeskrivelse(sak) && (
          <BodyShort size="small" truncate>
            {getBeskrivelse(sak)}
          </BodyShort>
        )}
      </VStack>
    </Kort>
  );
}
